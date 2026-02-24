"use client";

import type { CompileResult } from "@/lib/api";

export default function ErrorPanel({ result }: { result: CompileResult | null }) {
  if (!result || result.success || !result.stderr) return null;

  return (
    <div className="border-t border-macos-border bg-macos-surface px-4 py-2 max-h-32 overflow-y-auto flex-shrink-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-macos-error text-xs font-semibold uppercase tracking-wide">
          Compile Error
        </span>
      </div>
      <pre className="text-xs text-macos-error font-mono whitespace-pre-wrap leading-relaxed">
        {result.stderr}
      </pre>
    </div>
  );
}
