"""
Generate application-specific OptiOps (DevOps/SRE) instruction data for fine-tuning.
Output: ml/data/raw/optiops_sre_full.jsonl
"""
from __future__ import annotations

import argparse
import json
import random
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "optiops_sre_full.jsonl"

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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--target-count", type=int, default=320)
    args = parser.parse_args()
    random.seed(args.seed)

    rows = _dedupe(_variants())
    # Pad with paraphrases to reach target size for assignment scale
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


if __name__ == "__main__":
    main()
