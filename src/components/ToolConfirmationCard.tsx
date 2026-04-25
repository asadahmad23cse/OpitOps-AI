"use client";

import { AlertTriangle, Ban, CheckCircle2, Loader2, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToolCardState = "pending" | "executing" | "completed" | "denied" | "error";

interface ToolConfirmationCardProps {
  action: string;
  parameters?: unknown;
  state: ToolCardState;
  result?: unknown;
  errorText?: string;
  onApprove?: () => void;
  onDeny?: () => void;
}

function stringify(value: unknown): string {
  if (value === undefined) return "None";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getStatusLabel(state: ToolCardState): string {
  switch (state) {
    case "pending":
      return "Awaiting approval";
    case "executing":
      return "Executing...";
    case "completed":
      return "Completed";
    case "denied":
      return "Denied";
    case "error":
      return "Failed";
    default:
      return "Pending";
  }
}

export function ToolConfirmationCard({
  action,
  parameters,
  state,
  result,
  errorText,
  onApprove,
  onDeny,
}: ToolConfirmationCardProps) {
  const isPending = state === "pending";
  const isExecuting = state === "executing";
  const isCompleted = state === "completed";
  const isDenied = state === "denied";
  const isError = state === "error";

  return (
    <div
      className={cn(
        "rounded-lg border bg-black/20 p-3 space-y-3",
        isCompleted && "border-emerald-500/40",
        isPending && "border-cyan-500/40",
        isExecuting && "border-amber-500/40",
        isDenied && "border-gray-500/40",
        isError && "border-red-500/40",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-cyan-500/10 text-cyan-300 flex items-center justify-center">
            <Wrench className="w-3.5 h-3.5" />
          </div>
          <p className="text-xs font-semibold text-gray-100">{action}</p>
        </div>
        <div
          className={cn(
            "inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border",
            isCompleted && "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
            isPending && "text-cyan-300 border-cyan-500/30 bg-cyan-500/10",
            isExecuting && "text-amber-300 border-amber-500/30 bg-amber-500/10",
            isDenied && "text-gray-300 border-gray-500/30 bg-gray-500/10",
            isError && "text-red-300 border-red-500/30 bg-red-500/10",
          )}
        >
          {isExecuting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : null}
          {isDenied ? <Ban className="w-3 h-3" /> : null}
          {isError ? <AlertTriangle className="w-3 h-3" /> : null}
          {getStatusLabel(state)}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-wide text-gray-500">Parameters</p>
        <pre className="text-[11px] text-gray-200 whitespace-pre-wrap break-all bg-white/5 rounded-md p-2 border border-white/10">
          {stringify(parameters)}
        </pre>
      </div>

      {isCompleted && result !== undefined ? (
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Result</p>
          <pre className="text-[11px] text-emerald-100 whitespace-pre-wrap break-all bg-emerald-500/10 rounded-md p-2 border border-emerald-500/20">
            {stringify(result)}
          </pre>
        </div>
      ) : null}

      {(isDenied || isError) && errorText ? (
        <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-md p-2">{errorText}</p>
      ) : null}

      {isPending && (onApprove || onDeny) ? (
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onApprove}
            className="text-xs px-3 py-1.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/30 transition-colors"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={onDeny}
            className="text-xs px-3 py-1.5 rounded-md bg-red-500/20 border border-red-500/40 text-red-200 hover:bg-red-500/30 transition-colors"
          >
            Deny
          </button>
        </div>
      ) : null}
    </div>
  );
}
