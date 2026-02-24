"use client";

import { useCallback, useRef, useState } from "react";
import { compile, writeFile, pdfUrl, CompileResult } from "./api";

export type CompileStatus = "idle" | "saving" | "compiling" | "success" | "error";

export function useCompiler(filePath: string | null) {
  const [status, setStatus]       = useState<CompileStatus>("idle");
  const [result, setResult]       = useState<CompileResult | null>(null);
  const [pdfSrc, setPdfSrc]       = useState<string>("");
  const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerCompile = useCallback(
    async (content: string) => {
      if (!filePath) return;

      setStatus("saving");
      try {
        await writeFile(filePath, content);
      } catch {
        setStatus("error");
        setResult({ success: false, stderr: "Failed to save file", duration_ms: 0, pdf_url: null });
        return;
      }

      setStatus("compiling");
      try {
        const r = await compile();
        setResult(r);
        if (r.success) {
          setPdfSrc(pdfUrl());
          setStatus("success");
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
        setResult({ success: false, stderr: "Compile request failed", duration_ms: 0, pdf_url: null });
      }
    },
    [filePath]
  );

  const scheduleCompile = useCallback(
    (content: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => triggerCompile(content), 700);
    },
    [triggerCompile]
  );

  const compileNow = useCallback(
    (content: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      triggerCompile(content);
    },
    [triggerCompile]
  );

  return { status, result, pdfSrc, scheduleCompile, compileNow };
}
