"""
Local FastAPI server for OptiOps Qwen2.5-0.5B + optional QLoRA adapter inference.
Run from repo: cd ml/server && uvicorn inference_server:app --host 0.0.0.0 --port 8001
"""
from __future__ import annotations

import threading
from pathlib import Path
from typing import Any

import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

try:
    from peft import PeftModel
except ImportError:  # pragma: no cover
    PeftModel = None  # type: ignore[misc, assignment]

ML_ROOT = Path(__file__).resolve().parents[1]
ADAPTER_DIR = ML_ROOT / "models" / "qlora-adapter"
BASE_MODEL_ID = "Qwen/Qwen2.5-0.5B-Instruct"

SYSTEM_PROMPT = (
    "You are an AI assistant for OptiOps AI, a DevOps/SRE dashboard. "
    "You help users understand infrastructure health, alerts, deployments, "
    "costs (Indian Rupees / INR when relevant), and logs. Be concise and technical."
)

_state_lock = threading.Lock()
_state: dict[str, Any] = {
    "status": "loading",
    "base_model": BASE_MODEL_ID,
    "adapter_loaded": False,
    "error": None,
}

_tokenizer: AutoTokenizer | None = None
_model: Any = None
_has_peft_adapter: bool = False


def _adapter_ready() -> bool:
    cfg = ADAPTER_DIR / "adapter_config.json"
    return ADAPTER_DIR.is_dir() and cfg.is_file()


def _load_weights() -> None:
    global _tokenizer, _model, _has_peft_adapter

    try:
        tok = AutoTokenizer.from_pretrained(BASE_MODEL_ID, trust_remote_code=True)
        if tok.pad_token is None:
            tok.pad_token = tok.eos_token

        use_adapter = _adapter_ready()
        if use_adapter and PeftModel is None:
            use_adapter = False

        model = None
        try:
            bnb = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_use_double_quant=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.bfloat16,
            )
            model = AutoModelForCausalLM.from_pretrained(
                BASE_MODEL_ID,
                quantization_config=bnb,
                device_map="auto",
                trust_remote_code=True,
            )
        except Exception:
            model = AutoModelForCausalLM.from_pretrained(
                BASE_MODEL_ID,
                torch_dtype=torch.float16,
                device_map="auto",
                trust_remote_code=True,
            )

        if use_adapter:
            _model = PeftModel.from_pretrained(model, str(ADAPTER_DIR))  # type: ignore[assignment]
            _has_peft_adapter = True
        else:
            _model = model
            _has_peft_adapter = False

        _tokenizer = tok

        with _state_lock:
            _state["status"] = "ready"
            _state["adapter_loaded"] = _has_peft_adapter
            _state["error"] = None
    except Exception as e:  # pragma: no cover
        with _state_lock:
            _state["status"] = "error"
            _state["error"] = str(e)


_loader_thread = threading.Thread(target=_load_weights, daemon=True)
_loader_thread.start()

app = FastAPI(title="OptiOps Local LLM", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: str = Field(..., description="user or assistant")
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    history: list[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    response: str


class CompareRequest(BaseModel):
    message: str = Field(..., min_length=1)


class CompareResponse(BaseModel):
    fine_tuned_response: str
    base_response: str
    adapter_loaded: bool


def _ensure_ready() -> None:
    with _state_lock:
        st = _state["status"]
        err = _state.get("error")
    if st == "loading":
        raise HTTPException(status_code=503, detail="Model is still loading. Try again shortly.")
    if st == "error":
        raise HTTPException(
            status_code=503,
            detail=err or "Model failed to load.",
        )


@torch.inference_mode()
def _generate_from_chat_messages(
    messages: list[dict[str, str]],
    *,
    use_adapter: bool,
    max_new_tokens: int = 1024,
) -> str:
    if _tokenizer is None or _model is None:
        raise HTTPException(status_code=503, detail="Model not initialized.")

    text = _tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
    )
    inputs = _tokenizer(text, return_tensors="pt", truncation=True, max_length=4096)
    dev = next(_model.parameters()).device
    inputs = {k: v.to(dev) for k, v in inputs.items()}

    def _run_generate() -> torch.Tensor:
        return _model.generate(  # type: ignore[union-attr]
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            pad_token_id=_tokenizer.pad_token_id,
        )

    if _has_peft_adapter and PeftModel is not None and isinstance(_model, PeftModel):
        if use_adapter:
            out = _run_generate()
        else:
            with _model.disable_adapter():
                out = _run_generate()
    else:
        out = _run_generate()

    full = _tokenizer.decode(out[0], skip_special_tokens=True)
    if text.strip() and full.startswith(text.strip()):
        return full[len(text) :].strip()
    return full.strip()


def _build_messages(user_message: str, history: list[ChatMessage]) -> list[dict[str, str]]:
    msgs: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in history:
        r = h.role.lower().strip()
        if r not in ("user", "assistant"):
            continue
        msgs.append({"role": r, "content": h.content.strip()})
    msgs.append({"role": "user", "content": user_message.strip()})
    return msgs


@app.get("/health")
def health() -> dict[str, Any]:
    with _state_lock:
        return {
            "status": _state["status"],
            "model": _state["base_model"],
            "adapter_loaded": bool(_state.get("adapter_loaded")),
            "error": _state.get("error"),
        }


@app.post("/chat", response_model=ChatResponse)
def chat(body: ChatRequest) -> ChatResponse:
    _ensure_ready()
    messages = _build_messages(body.message, body.history)
    use_adapter = _has_peft_adapter
    text = _generate_from_chat_messages(messages, use_adapter=use_adapter)
    return ChatResponse(response=text)


@app.post("/chat/compare", response_model=CompareResponse)
def chat_compare(body: CompareRequest) -> CompareResponse:
    """Single-turn compare: fine-tuned (adapter) vs base weights for ML demos."""
    _ensure_ready()
    messages = _build_messages(body.message, [])
    if _has_peft_adapter:
        ft = _generate_from_chat_messages(messages, use_adapter=True)
        base = _generate_from_chat_messages(messages, use_adapter=False)
    else:
        base = _generate_from_chat_messages(messages, use_adapter=False)
        ft = base
    return CompareResponse(
        fine_tuned_response=ft,
        base_response=base,
        adapter_loaded=_has_peft_adapter,
    )


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "optiops-inference", "docs": "/docs"}
