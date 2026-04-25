"""
QLoRA fine-tuning (PEFT LoRA + 4-bit) for OptiOps SRE instruction tuning.

Justification (see ml/README.md): 4-bit NF4 reduces VRAM so a student GPU can
train; LoRA updates ~1-2% of parameters, preserving base knowledge while adapting
to OptiOps-style incident/cost/deploy language without full fine-tune drift.
"""
from __future__ import annotations

import argparse
import inspect
from pathlib import Path

import torch
from datasets import load_dataset
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from trl import SFTConfig, SFTTrainer

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MODEL = "Qwen/Qwen2.5-0.5B-Instruct"


def build_text_batch(examples: dict) -> dict:
    texts = []
    for inst, inp, out in zip(
        examples["instruction"], examples["input"], examples["output"]
    ):
        inp = (inp or "").strip() or "N/A"
        texts.append(
            f"### Instruction:\n{inst}\n\n### Input:\n{inp}\n\n### Response:\n{out}"
        )
    return {"text": texts}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument(
        "--train-file",
        type=Path,
        default=ROOT / "data" / "processed" / "train.jsonl",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "models" / "qlora-adapter",
        help="QLoRA adapter output dir (inference server loads ml/models/qlora-adapter/).",
    )
    parser.add_argument("--epochs", type=float, default=2.0)
    parser.add_argument("--lr", type=float, default=2e-4)
    parser.add_argument("--batch", type=int, default=2)
    parser.add_argument("--grad-acc", type=int, default=4)
    parser.add_argument("--max-length", type=int, default=512)
    parser.add_argument(
        "--fp16-no-bnb",
        action="store_true",
        help="Train in fp16 without bitsandbytes (use if 4-bit unavailable, needs more VRAM).",
                    )
    args = parser.parse_args()

    if not args.train_file.exists():
        raise SystemExit(f"Missing {args.train_file}. Run preprocess_split.py.")

    args.output.mkdir(parents=True, exist_ok=True)

    tokenizer = AutoTokenizer.from_pretrained(args.model, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    if args.fp16_no_bnb:
        model = AutoModelForCausalLM.from_pretrained(
            args.model,
            torch_dtype=torch.float16,
            device_map="auto",
            trust_remote_code=True,
        )
        model.gradient_checkpointing_enable()
        lora_config = LoraConfig(
            r=16,
            lora_alpha=32,
            lora_dropout=0.05,
            bias="none",
            task_type="CAUSAL_LM",
            target_modules=[
                "q_proj",
                "k_proj",
                "v_proj",
                "o_proj",
                "gate_proj",
                "up_proj",
                "down_proj",
            ],
        )
        model = get_peft_model(model, lora_config)
    else:
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16,
        )
        model = AutoModelForCausalLM.from_pretrained(
            args.model,
            quantization_config=bnb_config,
            device_map="auto",
            trust_remote_code=True,
        )
        model = prepare_model_for_kbit_training(model)
        lora_config = LoraConfig(
            r=16,
            lora_alpha=32,
            lora_dropout=0.05,
            bias="none",
            task_type="CAUSAL_LM",
            target_modules=[
                "q_proj",
                "k_proj",
                "v_proj",
                "o_proj",
                "gate_proj",
                "up_proj",
                "down_proj",
            ],
        )
        model = get_peft_model(model, lora_config)

    dataset = load_dataset("json", data_files=str(args.train_file), split="train")
    dataset = dataset.map(build_text_batch, batched=True)
    dataset = dataset.remove_columns([c for c in dataset.column_names if c != "text"])

    sft_kwargs = {
        "output_dir": str(args.output),
        "num_train_epochs": args.epochs,
        "per_device_train_batch_size": args.batch,
        "gradient_accumulation_steps": args.grad_acc,
        "learning_rate": args.lr,
        "logging_steps": 10,
        "save_strategy": "epoch",
        "warmup_ratio": 0.03,
        "dataset_text_field": "text",
        "fp16": args.fp16_no_bnb,
        "bf16": not args.fp16_no_bnb,
        "optim": "paged_adamw_8bit" if not args.fp16_no_bnb else "adamw_torch",
        "report_to": "none",
    }
    # TRL renamed this field across versions; support both old and new.
    sft_fields = set(inspect.signature(SFTConfig).parameters.keys())
    if "max_seq_length" in sft_fields:
        sft_kwargs["max_seq_length"] = args.max_length
    elif "max_length" in sft_fields:
        sft_kwargs["max_length"] = args.max_length

    training_args = SFTConfig(**sft_kwargs)

    try:
        trainer = SFTTrainer(
            model=model,
            args=training_args,
            train_dataset=dataset,
            processing_class=tokenizer,
        )
    except TypeError:
        trainer = SFTTrainer(
            model=model,
            args=training_args,
            train_dataset=dataset,
            tokenizer=tokenizer,
        )
    trainer.train()
    trainer.save_model(str(args.output))
    tokenizer.save_pretrained(str(args.output))
    print(f"Saved LoRA adapter to {args.output}")


if __name__ == "__main__":
    main()
