# OptiOps AI

Production-focused DevOps/SRE dashboard built with Next.js 16.

## 1. Local Run

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

## 2. Environment Setup

Create `.env.local` from `.env.example` and fill required values:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `GROQ_API_KEY`
- `NEXT_PUBLIC_LOCAL_LLM_URL` (default: `http://localhost:8001`)
- `GITHUB_OWNER`
- `GITHUB_TOKEN`

## 3. Quality Gates

Run before every push:

```bash
npm run lint
npm run build
```

CI is configured in `.github/workflows/ci.yml` and enforces lint + build on `main`.

## 4. Health Check

Runtime health endpoint:

- `GET /api/health`

It returns app status and key integration checks (Clerk, Groq, GitHub, local model endpoint).

## 5. Security Hardening Included

- Security headers configured in `next.config.ts`
- API rate limiting on `POST /api/ai/chat`
- Clerk auth gate on protected routes via `src/proxy.ts`
- Runtime/cache state is excluded from git (`/data/runtime/`)

## 6. Production Checklist

1. Set all production env vars in hosting platform (Netlify/Vercel/etc.).
2. Enable HTTPS and set secure cookie policy at platform level.
3. Verify `npm run lint` and `npm run build` pass in CI.
4. Verify `/api/health` status in deployed environment.
5. Configure alerting on app downtime and API error spikes.
6. Rotate API keys/tokens periodically.

## 7. Important Note About "Real" Data

Dashboard is wired to live runtime sources and GitHub-derived deployment data.  
For full enterprise production accuracy, connect infrastructure/cost/alert pipelines to your real observability stack (CloudWatch/Datadog/Prometheus + billing APIs).

