# OptiOps local inference server (FastAPI)

Serves **Qwen/Qwen2.5-0.5B-Instruct** with an optional **QLoRA** adapter from `ml/models/qlora-adapter/` for the Next.js dashboard (AI Assistant + ML Research).

## 1. Train (or copy) the adapter

From the `ml/` folder (see main `ml/README.md`):

```bash
python scripts/train_qlora.py
```

By default this writes the adapter to `ml/models/qlora-adapter/`. If you trained to another path, copy the adapter directory (must include `adapter_config.json`) into `ml/models/qlora-adapter/`.

## 2. Install server dependencies

```bash
cd ml/server
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate   # macOS/Linux
pip install -r requirements-server.txt
```

**Windows:** `bitsandbytes` may be omitted by pip; the server falls back to fp16 automatically (more VRAM).

## 3. Start the API

```bash
cd ml/server
uvicorn inference_server:app --host 0.0.0.0 --port 8001
```

Or:

```bash
chmod +x start_server.sh
./start_server.sh
```

The process **loads weights in a background thread**. Until loading finishes, `GET /health` returns `"status": "loading"` and chat returns **503**.

## 4. Connect the dashboard

1. Set `NEXT_PUBLIC_LOCAL_LLM_URL=http://localhost:8001` in `.env.local` (optional; this is the default).
2. Run Next.js (`npm run dev`).
3. In **AI Assistant**, choose **Fine-tuned**; in **Settings → AI Model**, use **Test connection**.

Endpoints:

- `GET /health` — `status`: `loading` | `ready` | `error`, `adapter_loaded`, `model`
- `POST /chat` — `{ "message": string, "history": [{ "role": "user"|"assistant", "content": string }] }` → `{ "response": string }`
- `POST /chat/compare` — single-turn **base vs QLoRA** (ML Research panel)

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| Out of memory | Close other GPU apps; use a machine with more VRAM; ensure no duplicate model copies |
| `bitsandbytes` import error | Use Linux/WSL or rely on fp16 fallback (automatic) |
| Chat 503 “still loading” | Wait until first load completes (30s–few minutes on CPU) |
| Adapter ignored | Confirm `ml/models/qlora-adapter/adapter_config.json` exists |
| Browser cannot reach `localhost:8001` | Confirm firewall; wrong port; server bound to `0.0.0.0` |
| Next.js shows offline | Ensure server is up; same machine as browser for `localhost` |

## CORS

`CORSMiddleware` allows all origins so `http://localhost:3000` can call the API directly.
