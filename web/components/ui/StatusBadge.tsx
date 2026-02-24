"use client";

import type { CompileStatus } from "@/lib/useCompiler";

const STATUS_CONFIG: Record<CompileStatus, { label: string; color: string }> = {
  idle:      { label: "Ready",      color: "text-macos-text-secondary" },
  saving:    { label: "Saving…",    color: "text-macos-warning" },
  compiling: { label: "Compiling…", color: "text-macos-accent" },
  success:   { label: "Compiled",   color: "text-macos-success" },
  error:     { label: "Error",      color: "text-macos-error" },
};

const DOT_COLOR: Record<CompileStatus, string> = {
  idle:      "bg-macos-text-secondary",
  saving:    "bg-macos-warning",
  compiling: "bg-macos-accent animate-pulse",
  success:   "bg-macos-success",
  error:     "bg-macos-error",
};

export default function StatusBadge({
  status,
  durationMs,
}: {
  status: CompileStatus;
  durationMs?: number;
}) {
  const { label, color } = STATUS_CONFIG[status];
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${DOT_COLOR[status]}`} />
      <span className={`text-xs font-medium ${color}`}>
        {label}
        {status === "success" && durationMs != null ? ` (${durationMs}ms)` : ""}
      </span>
    </div>
  );
}
