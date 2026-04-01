#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADAPTER="${SCRIPT_DIR}/../models/qlora-adapter"

if [[ -f "${ADAPTER}/adapter_config.json" ]]; then
  echo "[OptiOps] QLoRA adapter found at ${ADAPTER} — loading fine-tuned weights."
else
  echo "[OptiOps] WARNING: No adapter at ${ADAPTER} — serving BASE MODEL only."
  echo "           Train with: python ml/scripts/train_qlora.py (output → ml/models/qlora-adapter)"
fi

cd "${SCRIPT_DIR}"
exec uvicorn inference_server:app --host 0.0.0.0 --port 8001
