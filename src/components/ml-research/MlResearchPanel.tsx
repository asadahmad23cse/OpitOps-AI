"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { AlertTriangle, Database, FlaskConical, LineChart, Loader2, PlayCircle } from "lucide-react";
import { getLocalLlmBaseUrl, LOCAL_LLM_START_HELP } from "@/lib/local-llm";

type MetricRow = {
  method: string;
  rouge1_f1: number;
  rougeL_f1: number;
  bleu: number;
  n_samples: number;
};

type QualCase = {
  rougeL_f1: number;
  reference: string;
  prediction: string;
  instruction: string;
  category?: string;
};

type Report = {
  title: string;
  task: string;
  base_model: string;
  disclaimer?: string;
  split_manifest?: {
    counts?: { train: number; val: number; test: number };
    filters?: Record<string, unknown>;
  };
  metrics: MetricRow[];
  relative_improvement_rougeL_pct_vs_pretrained_min?: number | null;
  qualitative?: Record<
    string,
    {
      lowest_rougeL_cases: QualCase[];
    }
  >;
  error_analysis?: {
    hallucination_risk: string;
    failure_modes: string[];
  };
  real_world_applicability?: string;
};

const INFERENCE_SAMPLE =
  "Kubernetes pods for checkout-worker stay Pending with events showing insufficient CPU. What should OptiOps triage first?";

function InferenceTestPanel() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{
    fineTuned: string;
    base: string;
    adapterLoaded: boolean;
  } | null>(null);

  const run = async () => {
    setLoading(true);
    setErr(null);
    setResult(null);
    try {
      const url = `${getLocalLlmBaseUrl()}/chat/compare`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: INFERENCE_SAMPLE }),
      });
      if (!res.ok) {
        let msg = LOCAL_LLM_START_HELP;
        try {
          const raw = (await res.json()) as { detail?: unknown };
          if (typeof raw.detail === "string") msg = raw.detail;
        } catch {
          /* keep default */
        }
        setErr(msg);
        return;
      }
      const j = (await res.json()) as {
        fine_tuned_response: string;
        base_response: string;
        adapter_loaded: boolean;
      };
      setResult({
        fineTuned: j.fine_tuned_response,
        base: j.base_response,
        adapterLoaded: j.adapter_loaded,
      });
    } catch {
      setErr(LOCAL_LLM_START_HELP);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-emerald-500/5 p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Live inference test</h2>
          <p className="text-sm text-gray-400 mt-1 max-w-2xl">
            Calls the local FastAPI server (<code className="text-cyan-400/90">{getLocalLlmBaseUrl()}</code>){" "}
            <code className="text-cyan-400/90">/chat/compare</code>: same prompt through{" "}
            <strong className="text-gray-300">base</strong> vs <strong className="text-gray-300">QLoRA</strong>{" "}
            (identical answers if no adapter).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-sm font-medium hover:bg-cyan-500/30 disabled:opacity-50 shrink-0"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <PlayCircle className="w-4 h-4" />
          )}
          Run inference test
        </button>
      </div>

      <div className="rounded-lg border border-white/10 bg-black/30 p-3 mb-4">
        <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Sample query</p>
        <p className="text-sm text-gray-300">{INFERENCE_SAMPLE}</p>
      </div>

      {err ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{err}</div>
      ) : null}

      {result ? (
        <div className="grid gap-4 md:grid-cols-2 mt-4">
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
            <h3 className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wide">
              Fine-tuned {result.adapterLoaded ? "(QLoRA)" : "(base only)"}
            </h3>
            <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{result.fineTuned}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
              Pre-trained base (adapter off)
            </h3>
            <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{result.base}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function methodLabel(m: string) {
  switch (m) {
    case "pretrained_min":
      return "Pre-trained (minimal prompt)";
    case "prompt_engineered":
      return "Pre-trained + prompt engineering";
    case "qlora_finetuned":
      return "QLoRA fine-tuned";
    default:
      return m;
  }
}

export function MlResearchPanel() {
  const [data, setData] = useState<Report | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/ml-results/metrics.json")
      .then((r) => {
        if (!r.ok) throw new Error("Could not load metrics.json");
        return r.json();
      })
      .then(setData)
      .catch((e: Error) => setErr(e.message));
  }, []);

  if (err) {
    return (
      <div className="space-y-8">
        <InferenceTestPanel />
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
          <p className="font-medium">Failed to load ML results</p>
          <p className="mt-2 text-sm text-red-200/80">{err}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-8">
        <InferenceTestPanel />
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-white/5 rounded-lg" />
          <div className="h-64 bg-white/5 rounded-xl" />
        </div>
      </div>
    );
  }

  const chartData = data.metrics.map((r) => ({
    name: methodLabel(r.method),
    rougeL: r.rougeL_f1,
    rouge1: r.rouge1_f1,
  }));

  return (
    <div className="space-y-8">
      <InferenceTestPanel />

      {data.disclaimer ? (
        <div className="flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
          <p>{data.disclaimer}</p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
            <FlaskConical className="w-4 h-4" /> Dataset
          </div>
          <p className="text-2xl font-semibold text-white">
            {data.split_manifest?.counts
              ? `${data.split_manifest.counts.train + data.split_manifest.counts.val + data.split_manifest.counts.test}`
              : "—"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            train {data.split_manifest?.counts?.train ?? "—"} · val{" "}
            {data.split_manifest?.counts?.val ?? "—"} · test{" "}
            {data.split_manifest?.counts?.test ?? "—"}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
            <LineChart className="w-4 h-4" /> vs baseline
          </div>
          <p className="text-2xl font-semibold text-cyan-400">
            {data.relative_improvement_rougeL_pct_vs_pretrained_min != null
              ? `+${data.relative_improvement_rougeL_pct_vs_pretrained_min}%`
              : "—"}
          </p>
          <p className="text-xs text-gray-500 mt-1">ROUGE-L vs pre-trained minimal prompt</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
            <Database className="w-4 h-4" /> Base model
          </div>
          <p className="text-sm font-mono text-gray-200 break-all">{data.base_model}</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-medium text-white mb-4">Quantitative comparison</h2>
        <p className="text-sm text-gray-400 mb-2">{data.task}</p>
        <p className="text-xs text-gray-500 mb-6">
          Chart: ROUGE F1 (0–1). Corpus BLEU is on a different scale — see the table below.
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="name"
              tick={{ fill: "#6b7280", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-12}
              textAnchor="end"
              height={72}
            />
            <YAxis
              domain={[0, 1]}
              tick={{ fill: "#6b7280", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(17,24,39,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "12px",
              }}
            />
            <Legend />
            <Bar dataKey="rougeL" name="ROUGE-L F1" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            <Bar dataKey="rouge1" name="ROUGE-1 F1" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-white/10">
                <th className="pb-2 pr-4">Method</th>
                <th className="pb-2 pr-4">ROUGE-1 F1</th>
                <th className="pb-2 pr-4">ROUGE-L F1</th>
                <th className="pb-2 pr-4">BLEU</th>
                <th className="pb-2">n</th>
              </tr>
            </thead>
            <tbody>
              {data.metrics.map((m) => (
                <tr key={m.method} className="border-b border-white/5 text-gray-300">
                  <td className="py-2 pr-4">{methodLabel(m.method)}</td>
                  <td className="py-2 pr-4">{m.rouge1_f1}</td>
                  <td className="py-2 pr-4">{m.rougeL_f1}</td>
                  <td className="py-2 pr-4">{m.bleu}</td>
                  <td className="py-2">{m.n_samples}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {data.error_analysis ? (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-white font-medium mb-3">Hallucination &amp; safety</h3>
            <p className="text-sm text-gray-400 leading-relaxed">{data.error_analysis.hallucination_risk}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-white font-medium mb-3">Failure modes</h3>
            <ul className="list-disc list-inside text-sm text-gray-400 space-y-2">
              {data.error_analysis.failure_modes.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {data.real_world_applicability ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <h3 className="text-emerald-300 font-medium mb-2">Real-world applicability</h3>
          <p className="text-sm text-gray-300 leading-relaxed">{data.real_world_applicability}</p>
        </div>
      ) : null}

      {data.qualitative ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-6">
          <h3 className="text-white font-medium">Qualitative samples (lowest ROUGE-L)</h3>
          {Object.entries(data.qualitative).map(([method, block]) => {
            if (!block.lowest_rougeL_cases?.length) return null;
            return (
              <div key={method}>
                <p className="text-cyan-400 text-sm font-medium mb-2">{methodLabel(method)}</p>
                {block.lowest_rougeL_cases.map((c, i) => (
                  <div
                    key={i}
                    className="mb-4 rounded-lg border border-white/10 bg-black/20 p-4 text-xs space-y-2"
                  >
                    <p className="text-gray-500">ROUGE-L F1: {c.rougeL_f1}</p>
                    <p className="text-gray-300">
                      <span className="text-gray-500">Prompt: </span>
                      {c.instruction}
                    </p>
                    <p className="text-emerald-400/90">
                      <span className="text-gray-500">Reference: </span>
                      {c.reference}
                    </p>
                    <p className="text-amber-200/90">
                      <span className="text-gray-500">Model: </span>
                      {c.prediction}
                    </p>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
