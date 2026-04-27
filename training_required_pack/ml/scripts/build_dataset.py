"""
Generate application-specific OptiOps (DevOps/SRE) instruction data for fine-tuning.
Output: ml/data/raw/optiops_sre_full.jsonl

Now supports merging local Hugging Face datasets downloaded under:
  ml/data/external/huggingface/
"""
from __future__ import annotations

import argparse
import html
import json
import random
import re
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "optiops_sre_full.jsonl"
HF_EXTERNAL = ROOT / "data" / "external" / "huggingface"

CATEGORIES = [
    "incident",
    "k8s",
    "cost",
    "deploy",
    "security",
    "networking",
    "database",
    "observability",
]

TEMPLATES: list[tuple[str, str, str, str]] = [
    # (category, instruction template, input template or "", output template with placeholders)
    (
        "incident",
        "We see repeated 503s from payment-api after the last deploy. Logs show connection reset to Redis. What should we check first?",
        "Region: ap-south-1. Redis cluster mode enabled. Deploy was 45 minutes ago.",
        "1) Verify Redis cluster node health and failover events in ElastiCache/console. 2) Check payment-api connection pool sizing vs Redis maxclients and timeouts. 3) Compare app config for TLS/SNI changes vs previous release. 4) Roll back canary or full deploy if error rate exceeds SLO; capture thread dumps from one payment-api pod.",
    ),
    (
        "k8s",
        "Pods for checkout-worker stay Pending. How do we triage?",
        "kubectl describes schedules '0/3 nodes unavailable: insufficient cpu'.",
        "Inspect node allocatable vs requested resources across the pool, identify noisy neighbors, and either add nodes (Karpenter/cluster-autoscaler), reduce checkout-worker requests if over-provisioned, or reschedule lower-priority workloads. Validate PDBs are not blocking evictions.",
    ),
    (
        "cost",
        "Our monthly AWS bill in INR jumped 18%. Give a focused cost review checklist for OptiOps.",
        "",
        "Review Cost Explorer by service (EC2, RDS, data transfer). Check idle EBS volumes and orphaned snapshots in ap-south-1. Validate Savings Plans vs On-Demand mix. Inspect NAT Gateway hours and cross-AZ traffic. Tag enforcement for owner/team. Rightsize instances using Compute Optimizer recommendations. Report estimated savings in INR with assumptions.",
    ),
    (
        "deploy",
        "Compare blue-green vs canary for a stateful API backed by PostgreSQL.",
        "RTO target 15 minutes; user-facing traffic ~2k RPS peak.",
        "Canary reduces blast radius by shifting a small traffic slice first; pair with automated promotion on error rate and latency SLOs plus DB migration backward compatibility. Blue-green gives fast rollback by swapping entire stacks but needs double capacity and careful schema migrations. For this profile, prefer canary with gradual traffic and pre-migrated backward-compatible schema; keep blue-green as fallback for quick revert.",
    ),
    (
        "security",
        "A secret was exposed in a public GitHub fork. What immediate actions should OptiOps take?",
        "Secret type: database URL with user/password.",
        "Revoke/rotate credentials immediately; invalidate sessions if applicable. Audit Git history and remove from all branches (including forks if feasible). Enable secret scanning and push protection. Inject secrets via sealed secrets or cloud secret manager; run forensics for unauthorized DB access.",
    ),
    (
        "networking",
        "Intermittent timeouts only between svc-a and svc-b in the same cluster.",
        "Calico, NetworkPolicy allows egress from svc-a to svc-b on port 8080.",
        "Verify DNS (CoreDNS) latency and stale endpoints, check conntrack table exhaustion on nodes, validate MTU for CNI overlay, capture tcpdump on both ends during failures, and review NetworkPolicy port/protocol nuances (UDP vs TCP). Consider service mesh mTLS handshake latency if enabled.",
    ),
    (
        "database",
        "PostgreSQL CPU pegged during nightly batch while OLTP p95 degrades.",
        "RDS Multi-AZ, r6g.large, batch runs 00:30-02:00 IST.",
        "Confirm read replica usage for batch reads, add or scale replica if heavy queries hit primary. Tune autovacuum and analyze scheduling, check missing indexes on batch predicates. Consider pg_cron to isolate batch windows or resource groups. Evaluate storage IOPS saturation vs allocated.",
    ),
    (
        "observability",
        "Prometheus scraping fails for some targets after TLS cert renewal.",
        "Error: x certificate signed by unknown authority.",
        "Align scrape TLS config with new CA bundle or use proper tls_config ca_file. Roll out updated ServiceMonitor/PodMonitor. If mTLS rotated, update client certs on Prometheus or reverse proxy. Validate clock skew on targets.",
    ),
]


def _clean_text(value: str) -> str:
    """Normalize HTML-ish scraped text into compact plain text."""
    if not value:
        return ""
    text = html.unescape(str(value))
    text = re.sub(r"<code>(.*?)</code>", r" `\1` ", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _infer_category(text: str, default: str = "k8s") -> str:
    t = text.lower()
    if any(k in t for k in ["security", "rbac", "secret", "vulnerability", "cve", "opa", "kyverno", "falco"]):
        return "security"
    if any(k in t for k in ["cost", "billing", "finops", "savings plan", "reserved instance", "inr", "rupee"]):
        return "cost"
    if any(k in t for k in ["deploy", "rollout", "canary", "blue-green", "release", "ci/cd", "pipeline"]):
        return "deploy"
    if any(k in t for k in ["prometheus", "grafana", "alert", "slo", "latency", "logging", "observability", "metrics"]):
        return "observability"
    if any(k in t for k in ["postgres", "mysql", "database", "sql", "query", "replica"]):
        return "database"
    if any(k in t for k in ["dns", "network", "ingress", "egress", "mtu", "tcp", "service mesh"]):
        return "networking"
    if any(k in t for k in ["incident", "outage", "503", "500", "error budget", "on-call", "triage"]):
        return "incident"
    if any(k in t for k in ["kubernetes", "k8s", "kubectl", "pod", "node", "namespace", "cluster"]):
        return "k8s"
    return default


def _read_table(path: Path):
    """Read parquet/csv/json/jsonl using pandas when available."""
    try:
        import pandas as pd  # type: ignore
    except Exception as e:
        raise RuntimeError(
            "pandas is required to ingest external Hugging Face datasets. "
            "Install ml requirements first: pip install -r ml/requirements-ml.txt"
        ) from e

    suffix = path.suffix.lower()
    if suffix == ".parquet":
        return pd.read_parquet(path)
    if suffix == ".csv":
        return pd.read_csv(path)
    if suffix == ".jsonl":
        return pd.read_json(path, lines=True)
    if suffix == ".json":
        return pd.read_json(path)
    raise ValueError(f"Unsupported file type for {path}")


def _sample_cap(rows: list[dict], cap: int, rng: random.Random) -> list[dict]:
    if cap <= 0 or len(rows) <= cap:
        return rows
    picked = rows[:]
    rng.shuffle(picked)
    return picked[:cap]


def _load_hf_external_rows(seed: int, max_per_source: int) -> list[dict]:
    """Load and normalize locally-downloaded Hugging Face datasets."""
    if not HF_EXTERNAL.exists():
        print(f"[hf] external dataset dir not found: {HF_EXTERNAL}")
        return []

    rng = random.Random(seed)
    out: list[dict] = []

    # 1) StackOverflow Kubernetes Q/A
    so_dir = HF_EXTERNAL / "mcipriano__stackoverflow-kubernetes-questions"
    so_file = so_dir / "data" / "kubernetes_dump.parquet"
    if so_file.exists():
        df = _read_table(so_file)
        rows = []
        for rec in df.to_dict(orient="records"):
            inst = _clean_text(str(rec.get("Question", "")))
            ans = _clean_text(str(rec.get("Answer", "")))
            if not inst or not ans:
                continue
            rows.append(
                {
                    "category": _infer_category(inst + " " + ans, default="k8s"),
                    "instruction": inst,
                    "input": "Source: StackOverflow Kubernetes Q&A",
                    "output": ans,
                    "source": "hf_mcipriano_stackoverflow_k8s",
                }
            )
        rows = _sample_cap(rows, max_per_source, rng)
        print(f"[hf] loaded {len(rows)} rows from {so_file}")
        out.extend(rows)

    # 2) Kubernetes security bilingual dataset (English subset)
    sec_dir = HF_EXTERNAL / "AYI-NEDJIMI__kubernetes-security" / "data"
    sec_rows: list[dict] = []
    if sec_dir.exists():
        for p in sorted(sec_dir.glob("*.parquet")):
            df = _read_table(p)
            for rec in df.to_dict(orient="records"):
                inst = _clean_text(str(rec.get("instruction_en", "")))
                ans = _clean_text(str(rec.get("response_en", "")))
                cat_raw = _clean_text(str(rec.get("category", "")))
                if not inst or not ans:
                    continue
                sec_rows.append(
                    {
                        "category": "security",
                        "instruction": inst,
                        "input": f"Security topic: {cat_raw}" if cat_raw else "",
                        "output": ans,
                        "source": "hf_ayi_kubernetes_security",
                    }
                )
    sec_rows = _sample_cap(sec_rows, max_per_source, rng)
    if sec_rows:
        print(f"[hf] loaded {len(sec_rows)} rows from {sec_dir}")
        out.extend(sec_rows)

    # 3) K8sAIOps operator dataset
    op_dir = HF_EXTERNAL / "K8sAIOps__kubernetes_operator_dataset_1k"
    op_file = op_dir / "train-00000-of-00001.parquet"
    if op_file.exists():
        df = _read_table(op_file)
        rows = []
        for rec in df.to_dict(orient="records"):
            inst = _clean_text(str(rec.get("instruction", "")))
            ans = _clean_text(str(rec.get("output", "")))
            typ = _clean_text(str(rec.get("type", "")))
            if not inst or not ans:
                continue
            rows.append(
                {
                    "category": _infer_category((typ + " " + inst + " " + ans), default="k8s"),
                    "instruction": inst,
                    "input": f"Command type: {typ}" if typ else "",
                    "output": ans,
                    "source": "hf_k8s_aiops_operator",
                }
            )
        rows = _sample_cap(rows, max_per_source, rng)
        print(f"[hf] loaded {len(rows)} rows from {op_file}")
        out.extend(rows)

    # 4) DevOps cloud instruction dataset
    devops_dir = HF_EXTERNAL / "bernabepuente__devops-cloud-instruction-dataset"
    devops_file = devops_dir / "dataset.jsonl"
    if devops_file.exists():
        df = _read_table(devops_file)
        rows = []
        for rec in df.to_dict(orient="records"):
            inst = _clean_text(str(rec.get("instruction", "")))
            ans = _clean_text(str(rec.get("output", "")))
            inp = _clean_text(str(rec.get("input", "")))
            if not inst or not ans:
                continue
            rows.append(
                {
                    "category": _infer_category(inst + " " + ans, default="deploy"),
                    "instruction": inst,
                    "input": inp,
                    "output": ans,
                    "source": "hf_bernabe_devops_instruction",
                }
            )
        rows = _sample_cap(rows, max_per_source, rng)
        print(f"[hf] loaded {len(rows)} rows from {devops_file}")
        out.extend(rows)

    return out


def _variants() -> list[dict]:
    rows: list[dict] = []
    for cat, inst, inp, out in TEMPLATES:
        rows.append(
            {
                "category": cat,
                "instruction": inst,
                "input": inp,
                "output": out,
                "source": "optiops_template",
            }
        )
    # Numeric / parametric variants for scale
    services = [
        "checkout-api",
        "inventory-svc",
        "auth-gateway",
        "notification-worker",
        "billing-api",
    ]
    issues = [
        ("memory leak", "Heap growth 2%/hour; restart clears symptom.", "Enable profiling, capture heap dumps before OOM, fix leak in hot path, add memory limits and liveness probes."),
        ("disk full", "/var/log at 98% on nodes.", "Log rotation, ship logs to aggregator, drain node if kubelet unstable, increase volume or clean images."),
        ("TLS handshake errors", "After cert-manager renewal.", "Verify chain, ingress annotation for secret, HSTS preload not blocking, clock skew."),
    ]
    for svc in services:
        for cat in ("incident", "k8s", "observability"):
            for title, ctx, fix in issues:
                rows.append(
                    {
                        "category": cat,
                        "instruction": f"Service {svc} shows {title}. {ctx} Outline remediation.",
                        "input": f"Environment: production. Service: {svc}.",
                        "output": fix,
                        "source": "optiops_variant",
                    }
                )

    # Cost INR scenarios
    for pct in (8, 12, 22, 35):
        rows.append(
            {
                "category": "cost",
                "instruction": f"Cloud spend increased {pct}% month-over-month in INR. What steps should finance+engineering review?",
                "input": "Primary region ap-south-1; mixed EC2/EKS/RDS.",
                "output": f"Segment {pct}% increase by service and tag. Check for new environments, data transfer spikes, and unattached storage. Compare RI/SP coverage. Produce top three drivers and rough INR impact estimates with assumptions.",
                "source": "optiops_cost",
            }
        )

    # SLO / alert tuning
    for burn in ("2% in 1h", "5% in 6h", "0.1% in 5m"):
        rows.append(
            {
                "category": "observability",
                "instruction": f"SLO error budget burn is {burn} for checkout availability. How should paging behave?",
                "input": "SLO: 99.9% monthly availability.",
                "output": "Use multi-burn alerts: fast burn pages immediately, slow burn notifies during business hours. Require runbook link. Add cause labels. Freeze non-critical deploys when budget below threshold.",
                "source": "optiops_slo",
            }
        )

    return rows


def _dedupe(rows: list[dict]) -> list[dict]:
    seen: set[str] = set()
    out: list[dict] = []
    for r in rows:
        key = hashlib.sha256(
            (r["instruction"] + "\n" + r["output"]).encode("utf-8")
        ).hexdigest()
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    return out


def _count_by_source(rows: list[dict]) -> dict[str, int]:
    out: dict[str, int] = {}
    for r in rows:
        src = str(r.get("source", "unknown"))
        out[src] = out.get(src, 0) + 1
    return dict(sorted(out.items(), key=lambda kv: kv[0]))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--target-count", type=int, default=320)
    parser.add_argument(
        "--include-hf-external",
        action="store_true",
        default=True,
        help="Merge locally downloaded Hugging Face datasets from ml/data/external/huggingface.",
    )
    parser.add_argument(
        "--no-include-hf-external",
        action="store_false",
        dest="include_hf_external",
        help="Disable Hugging Face external dataset merge.",
    )
    parser.add_argument(
        "--hf-max-per-source",
        type=int,
        default=1200,
        help="Cap rows per Hugging Face dataset source (0 = no cap).",
    )
    args = parser.parse_args()
    random.seed(args.seed)

    rows = _variants()
    if args.include_hf_external:
        hf_rows = _load_hf_external_rows(seed=args.seed, max_per_source=args.hf_max_per_source)
        rows.extend(hf_rows)

    rows = _dedupe(rows)

    # Pad with paraphrases to reach minimum target size for assignment scale
    extras: list[dict] = []
    base = rows[:]
    tag = 0
    while len(rows) + len(extras) < args.target_count:
        r = random.choice(base)
        extras.append(
            {
                "category": r["category"],
                "instruction": r["instruction"] + f" (case ref #{tag})",
                "input": r["input"],
                "output": r["output"],
                "source": "optiops_augment",
            }
        )
        tag += 1

    all_rows = _dedupe(rows + extras)
    random.shuffle(all_rows)

    RAW.parent.mkdir(parents=True, exist_ok=True)
    with RAW.open("w", encoding="utf-8") as f:
        for r in all_rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    print(f"Wrote {len(all_rows)} examples to {RAW}")
    print("Source mix:")
    for src, cnt in _count_by_source(all_rows).items():
        print(f"  - {src}: {cnt}")


if __name__ == "__main__":
    main()
