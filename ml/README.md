# OptiOps ML assignment pipeline

This folder satisfies the college rubric: **dataset → split → QLoRA → baselines → metrics (BLEU/ROUGE) → SQLite + Chroma → UI** (`/ml-research` in the Next.js app).

## Why QLoRA (brief justification)

- **4-bit NF quantization** (when `bitsandbytes` is available) loads the base LLM with far less VRAM so training is feasible on a single consumer GPU.
- **LoRA** updates a low-rank adapter on attention/MLP projections instead of full weights: fewer trainable parameters, **less catastrophic forgetting**, faster iterations, and smaller artifacts to version for an internal assistant.
- Together, QLoRA is a standard, reproducible PEFT choice for **domain adaptation** (here: OptiOps-style incident / cost / deploy language) without full fine-tuning cost.

Use **prompt-only baselines** to show that engineering prompts helps, but **PEFT still adds measurable gain** on top of the same minimal template the model was trained with.

## Environment

```bash
cd ml
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements-ml.txt
```

- **Linux + NVIDIA GPU**: QLoRA as written (4-bit) is the default path.
- **Windows native**: `bitsandbytes` often fails; use `python scripts/train_qlora.py --fp16-no-bnb` (needs more VRAM) or **WSL2 / cloud GPU / Colab**.
- **HF access**: if downloads are rate-limited, run `huggingface-cli login`.

## End-to-end commands

From `ml/`:

1. **Build application-specific dataset** (JSONL; domains: incident, k8s, cost, etc.)

   ```bash
   python scripts/build_dataset.py --target-count 320
   ```

2. **Quality filters + stratified ~70/15/15 split** (round-robin per category)

   ```bash
   python scripts/preprocess_split.py
   ```

3. **SQLite metadata** (regular SQL storage for experiment provenance)

   ```bash
   python scripts/init_sqlite.py
   ```

4. **Vector DB** (Chroma persistent store + `sentence-transformers` embeddings of `data/knowledge/optiops_incidents_kb.txt`)

   ```bash
   python scripts/seed_chroma.py
   ```

5. **QLoRA fine-tuning**

   ```bash
   python scripts/train_qlora.py
   # or without 4-bit:
   # python scripts/train_qlora.py --fp16-no-bnb
   ```

   Adapter checkpoint: `ml/models/qlora-adapter/`

6. **Baselines + quantitative metrics + qualitative worst cases**  
   Compares **pre-trained + minimal template**, **pre-trained + OptiOps prompt framing**, and **QLoRA adapter + minimal template**. Writes:

   - `ml/results/metrics.json`
   - `../public/ml-results/metrics.json` (what the **ML Research** page reads)

   ```bash
   python scripts/evaluate_baselines.py
   # quick smoke test (subset):
   # python scripts/evaluate_baselines.py --max-samples 8 --max-new-tokens 128
   ```

   If the adapter path is missing, the script still evaluates the two pre-trained baselines and warns for QLoRA.

## Rubric mapping

| Requirement | Where |
|-------------|--------|
| Dataset quality, preprocessing, split | `scripts/build_dataset.py`, `scripts/preprocess_split.py`, `data/processed/manifest.json` |
| PEFT (QLoRA) + justification | `scripts/train_qlora.py`, this README |
| Baselines (pre-trained vs prompt-engineered vs fine-tuned) | `scripts/evaluate_baselines.py` |
| Storage (vector + SQL) | Chroma (`seed_chroma.py`), SQLite (`db/schema.sql`, `init_sqlite.py`) |
| BLEU / ROUGE | `evaluate_baselines.py` (SacreBLEU + `rouge-score`) |
| Qualitative + hallucination discussion | `metrics.json` fields + worst ROUGE-L cases from eval |
| Improvement + real-world story | Relative ROUGE-L delta in JSON + dashboard copy |
| Frontend | `/ml-research` + `public/ml-results/metrics.json` |

## Assignment submission tips

- Replace placeholder numbers in `public/ml-results/metrics.json` by running `evaluate_baselines.py` after real training; remove the `disclaimer` field in that file for the final write-up.
- Export 1–2 Chroma query screenshots or notebook cells if your instructor wants **evidence** of retrieval.
- Zip `ml/models/qlora-adapter/` adapter + report PDF alongside the repo if allowed.
