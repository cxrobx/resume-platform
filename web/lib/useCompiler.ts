"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { compile, writeFile, pdfUrl, CompileResult } from "./api";

export type CompileStatus = "idle" | "saving" | "compiling" | "success" | "error";

export function useCompiler(resume: string | null, filePath: string | null) {
  const [status, setStatus]       = useState<CompileStatus>("idle");
  const [result, setResult]       = useState<CompileResult | null>(null);
  const [pdfSrc, setPdfSrc]       = useState<string>("");

  const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the active resume so we can discard stale compile results
  const resumeRef                 = useRef(resume);

  // Full state reset + PDF re-init when resume changes
  useEffect(() => {
    resumeRef.current = resume;
    setStatus("idle");
    setResult(null);
    if (resume) {
      setPdfSrc(pdfUrl(resume));
    } else {
      setPdfSrc("");
    }
    // Cancel any in-flight debounce from the previous resume
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, [resume]);

  const triggerCompile = useCallback(
    async (content: string) => {
      if (!filePath || !resume) return;
      const activeResume = resume;

      setStatus("saving");
      try {
        await writeFile(activeResume, filePath, content);
      } catch {
        if (resumeRef.current !== activeResume) return; // stale
        setStatus("error");
        setResult({ success: false, stderr: "Failed to save file", duration_ms: 0, pdf_url: null });
        return;
      }

      if (resumeRef.current !== activeResume) return; // stale
      setStatus("compiling");
      try {
        const r = await compile(activeResume);
        if (resumeRef.current !== activeResume) return; // stale
        setResult(r);
        if (r.success) {
          setPdfSrc(pdfUrl(activeResume));
          setStatus("success");
        } else {
          setStatus("error");
        }
      } catch {
        if (resumeRef.current !== activeResume) return; // stale
        setStatus("error");
        setResult({ success: false, stderr: "Compile request failed", duration_ms: 0, pdf_url: null });
      }
    },
    [filePath, resume]
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

  // Compile without writing — used by the external-change poller so it doesn't
  // touch the file mtime and cause a detection loop.
  const compileOnly = useCallback(async () => {
    if (!resume) return;
    const activeResume = resume;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setStatus("compiling");
    try {
      const r = await compile(activeResume);
      if (resumeRef.current !== activeResume) return; // stale
      setResult(r);
      if (r.success) {
        setPdfSrc(pdfUrl(activeResume));
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      if (resumeRef.current !== activeResume) return; // stale
      setStatus("error");
      setResult({ success: false, stderr: "Compile request failed", duration_ms: 0, pdf_url: null });
    }
  }, [resume]);

  return { status, result, pdfSrc, scheduleCompile, compileNow, compileOnly };
}
