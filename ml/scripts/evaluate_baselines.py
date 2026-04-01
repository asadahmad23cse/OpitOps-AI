"""
Compare three conditions on the held-out test set:
  1) pretrained_min   - base model + minimal instruction template
  2) prompt_engineered - base model + OptiOps-specific system framing in the prompt
  3) qlora_finetuned   - QLoRA adapter + minimal template (matches training format)

Metrics: ROUGE-1 / ROUGE-L (avg F1), corpus BLEU via SacreBLEU.
Also writes qualitative worst-case samples and syncs metrics to the Next.js public folder.
"""
from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path

import torch
from peft import PeftModel
from rouge_score import rouge_scorer
from sacrebleu import corpus_bleu
from tqdm import tqdm
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

ROOT = Path(__file__).resolve().parents[1]
DASH_ROOT = ROOT.parent
PUBLIC_METRICS = DASH_ROOT / "public" / "ml-results" / "metrics.json"
DB_PATH = ROOT / "data" / "optiops_ml.db"
DEFAULT_MODEL = "Qwen/Qwen2.5-0.5B-Instruct"


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def build_prompt_min(instruction: str, inp: str) -> str:
    inp = (inp or "").strip() or "N/A"
    return f"### Instruction:\n{instruction}\n\n### Input:\n{inp}\n\n### Response:\n"


def build_prompt_eng(instruction: str, inp: str) -> str:
    prefix = (
        "You are OptiOps AI, a senior SRE assistant. "
        "Respond with concrete, ordered actions. Prefer cloud-agnostic patterns; "
        "use INR when discussing cost estimates.\n\n"
    )
    return build_prompt_min(prefix + instruction, inp)


def extract_answer(decoded: str) -> str:
    if "### Response:" in decoded:
        return decoded.split("### Response:")[-1].strip()
    return decoded.strip()


@torch.inference_mode()
def generate_answer(
    model,
    tokenizer,
    prompt: str,
    max_new_tokens: int,
) -> str:
    inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=2048)
    dev = next(model.parameters()).device
    inputs = {k: v.to(dev) for k, v in inputs.items()}
    out = model.generate(
        **inputs,
        max_new_tokens=max_new_tokens,
        do_sample=False,
        pad_token_id=tokenizer.pad_token_id,
    )
    full = tokenizer.decode(out[0], skip_special_tokens=True)
    # Model may repeat prompt; take completion after full prompt text if possible
    if prompt in full:
        gen = full.split(prompt, 1)[-1].strip()
        if gen:
            return gen
    return extract_answer(full)


def mean_rouge(refs: list[str], preds: list[str]) -> dict:
    scorer = rouge_scorer.RougeScorer(["rouge1", "rougeL"], use_stemmer=True)
    acc = {"rouge1_f": 0.0, "rougeL_f": 0.0}
    for r, p in zip(refs, preds):
        s = scorer.score(r, p)
        acc["rouge1_f"] += s["rouge1"].fmeasure
        acc["rougeL_f"] += s["rougeL"].fmeasure
    n = len(refs) or 1
    return {k: v / n for k, v in acc.items()}


def bleu_score(refs: list[str], preds: list[str]) -> float:
    return float(corpus_bleu(preds, [refs]).score)


def worst_examples(refs: list[str], preds: list[str], samples: list[dict], k: int = 2):
    scorer = rouge_scorer.RougeScorer(["rougeL"], use_stemmer=True)
    scored = []
    for i, (r, p) in enumerate(zip(refs, preds)):
        f = scorer.score(r, p)["rougeL"].fmeasure
        scored.append((f, i))
    scored.sort(key=lambda x: x[0])
    out = []
    for f, i in scored[:k]:
        out.append(
            {
                "rougeL_f1": round(f, 4),
                "reference": refs[i][:1200],
                "prediction": preds[i][:1200],
                "instruction": samples[i].get("instruction", "")[:400],
                "category": samples[i].get("category"),
            }
        )
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument(
        "--adapter",
        type=Path,
        default=ROOT / "models" / "qlora-adapter",
    )
    parser.add_argument(
        "--test-file",
        type=Path,
        default=ROOT / "data" / "processed" / "test.jsonl",
    )
    parser.add_argument("--max-samples", type=int, default=0, help="0 = full test set")
    parser.add_argument("--max-new-tokens", type=int, default=256)
    parser.add_argument("--fp16-no-bnb", action="store_true")
    args = parser.parse_args()

    if not args.test_file.exists():
        raise SystemExit(f"Missing {args.test_file}. Run preprocess_split.py.")

    samples = load_jsonl(args.test_file)
    if args.max_samples and args.max_samples < len(samples):
        samples = samples[: args.max_samples]

    tokenizer = AutoTokenizer.from_pretrained(args.model, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    if args.fp16_no_bnb:
        base = AutoModelForCausalLM.from_pretrained(
            args.model,
            torch_dtype=torch.float16,
            device_map="auto",
            trust_remote_code=True,
        )
    else:
        bnb = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16,
        )
        base = AutoModelForCausalLM.from_pretrained(
            args.model,
            quantization_config=bnb,
            device_map="auto",
            trust_remote_code=True,
        )

    refs = [s["output"] for s in samples]
    prompt_modes = [
        ("pretrained_min", lambda inst, inp: build_prompt_min(inst, inp)),
        ("prompt_engineered", lambda inst, inp: build_prompt_eng(inst, inp)),
    ]

    predictions: dict[str, list[str]] = {name: [] for name, _ in prompt_modes}

    for key, builder in prompt_modes:
        for s in tqdm(samples, desc=key):
            p = builder(s["instruction"], s.get("input") or "")
            predictions[key].append(generate_answer(base, tokenizer, p, args.max_new_tokens))

    # QLoRA
    if not args.adapter.exists():
        print(f"WARNING: adapter missing at {args.adapter}; skipping qlora_finetuned.")
        predictions["qlora_finetuned"] = [""] * len(samples)
    else:
        ft = PeftModel.from_pretrained(base, str(args.adapter))  # type: ignore[arg-type]
        preds_ft: list[str] = []
        for s in tqdm(samples, desc="qlora_finetuned"):
            p = build_prompt_min(s["instruction"], s.get("input") or "")
            preds_ft.append(generate_answer(ft, tokenizer, p, args.max_new_tokens))
        predictions["qlora_finetuned"] = preds_ft

    manifest_path = ROOT / "data" / "processed" / "manifest.json"
    split_info = {}
    if manifest_path.exists():
        split_info = json.loads(manifest_path.read_text(encoding="utf-8"))

    rows_metrics = []
    qualitative = {}

    for name, preds in predictions.items():
        if not any(preds):
            continue
        r = mean_rouge(refs, preds)
        bleu = bleu_score(refs, preds)
        rows_metrics.append(
            {
                "method": name,
                "rouge1_f1": round(r["rouge1_f"], 4),
                "rougeL_f1": round(r["rougeL_f"], 4),
                "bleu": round(bleu, 4),
                "n_samples": len(preds),
            }
        )
        qualitative[name] = {
            "lowest_rougeL_cases": worst_examples(refs, preds, samples),
        }

    improvement = None
    if predictions.get("qlora_finetuned") and any(predictions["qlora_finetuned"]):
        b1_rl = next(
            (m["rougeL_f1"] for m in rows_metrics if m["method"] == "pretrained_min"),
            None,
        )
        ft_rl = next(
            (m["rougeL_f1"] for m in rows_metrics if m["method"] == "qlora_finetuned"),
            None,
        )
        if b1_rl and ft_rl and b1_rl > 0:
            improvement = round((ft_rl - b1_rl) / b1_rl * 100, 2)

    report = {
        "title": "OptiOps SRE instruction model — assignment metrics",
        "task": "Application-specific DevOps/SRE QA (concise remediation text)",
        "base_model": args.model,
        "split_manifest": split_info,
        "metrics": rows_metrics,
        "relative_improvement_rougeL_pct_vs_pretrained_min": improvement,
        "qualitative": qualitative,
        "error_analysis": {
            "hallucination_risk": (
                "Small instruct models may invent resource sizes or regions not in the prompt. "
                "Mitigations: ground answers with RAG (Chroma KB), require the model to cite "
                "only given context, and keep humans in the loop for production changes."
            ),
            "failure_modes": [
                "Over-generic checklists when the prompt omits observability signals.",
                "Omitting INR/cost angle unless the prompt or engineered system text asks for it.",
                "Under-specified rollback criteria for stateful deploy questions.",
            ],
        },
        "real_world_applicability": (
            "The same pipeline backs the OptiOps dashboard assistant: domain-tuned models "
            "reduce off-topic replies for incident triage, pair with vector retrieval from "
            "historical incident notes, and log eval metrics to SQLite for regression tracking."
        ),
    }

    out_dir = ROOT / "results"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "metrics.json"
    out_file.write_text(json.dumps(report, indent=2), encoding="utf-8")
    PUBLIC_METRICS.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC_METRICS.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Wrote {out_file} and {PUBLIC_METRICS}")

    if DB_PATH.exists():
        conn = sqlite3.connect(DB_PATH)
        dr = conn.execute(
            "SELECT id FROM dataset_runs ORDER BY id DESC LIMIT 1"
        ).fetchone()
        dr_id = dr[0] if dr else None
        for row in rows_metrics:
            conn.execute(
                """INSERT INTO experiment_runs (dataset_run_id, name, method, base_model, peft_method, hardware_note)
                   VALUES (?,?,?,?,?,?)""",
                (
                    dr_id,
                    f"eval_{row['method']}",
                    row["method"],
                    args.model,
                    "qlora" if row["method"] == "qlora_finetuned" else "none",
                    "local_eval",
                ),
            )
            eid = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            for mk, mv in [("rouge1_f1", row["rouge1_f1"]), ("rougeL_f1", row["rougeL_f1"]), ("bleu", row["bleu"])]:
                conn.execute(
                    "INSERT INTO metrics (experiment_run_id, metric_name, metric_value) VALUES (?,?,?)",
                    (eid, mk, float(mv)),
                )
        conn.commit()
        conn.close()


if __name__ == "__main__":
    main()
