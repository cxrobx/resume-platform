"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchTree, readFile, statFile, FileNode } from "@/lib/api";
import { useCompiler } from "@/lib/useCompiler";
import FileTree from "./FileTree";
import MonacoPane from "./MonacoPane";
import PdfPreview from "./PdfPreview";
import ErrorPanel from "./ErrorPanel";
import StatusBadge from "@/components/ui/StatusBadge";

const DEFAULT_FILE = "src/resume.typ";

export default function Editor() {
  const [tree, setTree]         = useState<FileNode | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(DEFAULT_FILE);
  const [content, setContent]   = useState<string>("");
  const [loadError, setLoadError] = useState<string>("");

  // Track file modification time to detect external changes
  const mtimeRef     = useRef<number>(0);
  // Track when the user last typed so we don't reload mid-edit
  const lastEditRef  = useRef<number>(0);

  const { status, result, pdfSrc, scheduleCompile, compileNow, compileOnly } =
    useCompiler(selectedFile);

  // Load file tree once
  useEffect(() => {
    fetchTree()
      .then(setTree)
      .catch(() => setLoadError("Could not reach API. Is it running on :8001?"));
  }, []);

  // Load file content + mtime when selection changes
  useEffect(() => {
    if (!selectedFile) return;
    setContent("");
    readFile(selectedFile)
      .then((text) => {
        setContent(text);
        return statFile(selectedFile);
      })
      .then((mtime) => { mtimeRef.current = mtime; })
      .catch(() => setContent("// Could not load file"));
  }, [selectedFile]);

  // After each compile cycle, update our known mtime so our own saves
  // don't trigger a false external-change reload
  useEffect(() => {
    if ((status === "success" || status === "error") && selectedFile) {
      statFile(selectedFile)
        .then((mtime) => { mtimeRef.current = mtime; })
        .catch(() => {});
    }
  }, [status, selectedFile]);

  // Poll for external file changes every 2s
  useEffect(() => {
    if (!selectedFile) return;
    const interval = setInterval(async () => {
      // Don't reload if the user typed in the last 3 seconds
      if (Date.now() - lastEditRef.current < 3000) return;
      try {
        const mtime = await statFile(selectedFile);
        if (mtime > mtimeRef.current + 0.001) {
          const text = await readFile(selectedFile);
          setContent(text);
          mtimeRef.current = mtime;
          compileOnly();
        }
      } catch { /* ignore — API may be temporarily unreachable */ }
    }, 2000);
    return () => clearInterval(interval);
  }, [selectedFile, compileOnly]);

  const handleChange = useCallback(
    (val: string) => {
      lastEditRef.current = Date.now();
      setContent(val);
      scheduleCompile(val);
    },
    [scheduleCompile]
  );

  const handleSelectFile = useCallback((path: string) => {
    setSelectedFile(path);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-macos-bg text-macos-text overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 bg-macos-surface border-b border-macos-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm tracking-tight">Resume Platform</span>
          {selectedFile && (
            <span className="text-xs text-macos-text-secondary font-mono">{selectedFile}</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge status={status} durationMs={result?.duration_ms} />
          <button
            onClick={() => content && compileNow(content)}
            className="px-3 py-1 rounded text-xs font-medium bg-macos-accent hover:bg-macos-accent-hover text-white transition-colors"
          >
            Compile
          </button>
          {pdfSrc && (
            <a
              href={pdfSrc}
              download="resume.pdf"
              className="px-3 py-1 rounded text-xs font-medium bg-macos-elevated hover:bg-macos-border text-macos-text transition-colors"
            >
              Download
            </a>
          )}
        </div>
      </header>

      {loadError && (
        <div className="bg-macos-error/10 border-b border-macos-error/30 px-4 py-2 text-sm text-macos-error">
          {loadError}
        </div>
      )}

      {/* 3-panel body */}
      <div className="flex flex-1 overflow-hidden">
        {/* File tree */}
        <aside className="w-52 flex-shrink-0 bg-macos-surface border-r border-macos-border overflow-y-auto">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-widest text-macos-text-secondary border-b border-macos-border">
            Files
          </div>
          <FileTree tree={tree} selected={selectedFile} onSelect={handleSelectFile} />
        </aside>

        {/* Monaco editor */}
        <div className="flex flex-col flex-1 overflow-hidden border-r border-macos-border">
          <div className="flex-1 overflow-hidden">
            <MonacoPane value={content} onChange={handleChange} />
          </div>
          <ErrorPanel result={result} />
        </div>

        {/* PDF preview */}
        <div className="flex-1 overflow-hidden bg-macos-elevated">
          <PdfPreview src={pdfSrc} />
        </div>
      </div>
    </div>
  );
}
