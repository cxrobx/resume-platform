# Resume Platform — Windows Setup Prompt

Give this prompt to Claude Code (or any AI coding assistant) on a Windows machine, along with your resume PDF.

---

## THE PROMPT

```
I want you to build a self-hosted resume editor called "Resume Platform" — an Overleaf-lite app with a Monaco code editor, live PDF preview, and auto-compile. It uses Typst (not LaTeX) for typesetting, FastAPI for the backend, and Next.js for the frontend.

I'm attaching my current resume as a PDF. Use it as the content source AND visual target — the Typst template should reproduce this layout as closely as possible.

## What the resume looks like (from my PDF)

Two-column layout on US Letter paper:
- LEFT SIDEBAR (~30% width): Profile photo (circular crop), a quote block, "Capabilities" bullet list, "Technical" skills in two mini-columns, "Education" section, "Interests" section
- RIGHT MAIN AREA (~70% width): "Project Experience" header, then multiple job entries each with bold title, italic company name, and bullet points. At the very top-right there's a dashed-border "Strengths" box listing numbered strengths in a grid.
- Purple accent color (#7B2D8E or similar) for section headers and name
- Bold black section headers like "CAPABILITIES", "EDUCATION", "INTERESTS", "PROJECT EXPERIENCE", "STRENGTHS"
- Horizontal dashed rules separating job entries on the right side
- The name at top is large, bold, purple. Subtitle line below it. Email with an icon.

## Prerequisites to install (Windows)

1. **Python 3.9+** — install from python.org, make sure `python` and `pip` are on PATH
2. **Node.js 18+** — install from nodejs.org
3. **Typst** — install via `winget install typst` or download from https://github.com/typst/typst/releases (put typst.exe somewhere on PATH)

## Project structure to create

```
resume-platform/
├── resume/
│   ├── src/
│   │   ├── resume.typ        ← Content only (extracted from my PDF)
│   │   ├── theme.typ         ← Visual constants (colors, fonts, sizes)
│   │   └── sections.typ      ← Macro library (layout functions)
│   ├── build/                ← Compiler output (gitignored)
│   └── assets/
│       ├── fonts/            ← Custom fonts if needed
│       └── photo.jpg         ← Profile photo (I'll provide this)
├── api/
│   ├── main.py               ← FastAPI entry point
│   ├── requirements.txt
│   ├── routers/
│   │   ├── compile.py        ← POST /compile
│   │   └── files.py          ← GET /files/tree, /files/read, PUT /files/write, GET /files/pdf
│   └── services/
│       ├── sandbox.py        ← Path traversal prevention
│       └── compiler.py       ← Typst subprocess wrapper (15s timeout)
└── web/
    ├── package.json
    ├── next.config.ts
    ├── tailwind.config.ts
    ├── tsconfig.json
    ├── postcss.config.js
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx           ← Redirects to /editor
    │   ├── globals.css
    │   └── editor/
    │       └── page.tsx       ← Renders <Editor />
    ├── components/
    │   ├── Editor/
    │   │   ├── index.tsx      ← 3-panel shell (file tree + Monaco + PDF)
    │   │   ├── FileTree.tsx   ← Recursive file tree
    │   │   ├── MonacoPane.tsx ← Monaco editor (dynamic import, ssr: false)
    │   │   ├── PdfPreview.tsx ← iframe with key-based reload
    │   │   └── ErrorPanel.tsx ← Compile error display
    │   └── ui/
    │       └── StatusBadge.tsx ← Status indicator
    └── lib/
        ├── api.ts             ← All fetch wrappers
        └── useCompiler.ts     ← 700ms debounce hook: write → compile
```

## API layer (FastAPI)

### api/requirements.txt
```
fastapi==0.115.6
uvicorn[standard]==0.34.0
python-multipart==0.0.20
aiofiles==24.1.0
```

### api/main.py
```python
import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.sandbox import set_resume_root
from routers import compile, files

RESUME_ROOT = os.environ.get("RESUME_ROOT", "../resume")
API_PORT    = int(os.environ.get("API_PORT", 8001))

set_resume_root(RESUME_ROOT)

app = FastAPI(title="Resume Platform API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(compile.router)
app.include_router(files.router)


@app.get("/health")
async def health():
    return {"ok": True}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=API_PORT, reload=False)
```

### api/services/sandbox.py
```python
"""
Path sandboxing — all file ops must go through these functions.
No path ever escapes RESUME_ROOT.
"""
import os
from pathlib import Path
from typing import Optional
from fastapi import HTTPException

_resume_root: Optional[Path] = None

WRITE_ALLOWED_DIRS = {"src", "assets"}


def set_resume_root(path: str) -> None:
    global _resume_root
    _resume_root = Path(path).resolve()


def resume_root() -> Path:
    if _resume_root is None:
        raise RuntimeError("sandbox not initialised")
    return _resume_root


def resolve_safe(rel_path: str) -> Path:
    root = resume_root()
    try:
        target = (root / rel_path).resolve()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid path")
    if not str(target).startswith(str(root)):
        raise HTTPException(status_code=400, detail="Path traversal denied")
    return target


def resolve_read_safe(rel_path: str) -> Path:
    target = resolve_safe(rel_path)
    if not target.exists():
        raise HTTPException(status_code=404, detail=f"Not found: {rel_path}")
    return target


def resolve_write_safe(rel_path: str) -> Path:
    target = resolve_safe(rel_path)
    root = resume_root()
    rel = target.relative_to(root)
    top_dir = rel.parts[0] if rel.parts else ""
    if top_dir not in WRITE_ALLOWED_DIRS:
        raise HTTPException(
            status_code=403,
            detail=f"Writes only allowed in {WRITE_ALLOWED_DIRS}, got: {top_dir!r}",
        )
    return target
```

### api/services/compiler.py
```python
"""
Typst subprocess wrapper. 15-second timeout.
"""
import asyncio
import os
import time
from pathlib import Path

from services.sandbox import resume_root

TYPST_PATH = os.environ.get("TYPST_PATH", "typst")
COMPILE_TIMEOUT = 15
ENTRY_FILE = "src/resume.typ"
OUTPUT_FILE = "build/resume.pdf"


async def compile_typst() -> dict:
    root = resume_root()
    entry  = root / ENTRY_FILE
    output = root / OUTPUT_FILE
    output.parent.mkdir(parents=True, exist_ok=True)

    start = time.monotonic()
    try:
        fonts_dir = root / "assets" / "fonts"
        cmd = [TYPST_PATH, "compile"]
        if fonts_dir.is_dir():
            cmd += ["--font-path", str(fonts_dir)]
        cmd += [str(entry), str(output)]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=COMPILE_TIMEOUT)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.communicate()
            return {
                "success": False,
                "stderr": f"Compile timed out after {COMPILE_TIMEOUT}s",
                "duration_ms": int((time.monotonic() - start) * 1000),
                "pdf_url": None,
            }
    except FileNotFoundError:
        return {
            "success": False,
            "stderr": f"Typst not found at {TYPST_PATH!r}. Check TYPST_PATH env var.",
            "duration_ms": int((time.monotonic() - start) * 1000),
            "pdf_url": None,
        }

    duration_ms = int((time.monotonic() - start) * 1000)
    success = proc.returncode == 0

    return {
        "success": success,
        "stderr": stderr.decode("utf-8", errors="replace").strip(),
        "duration_ms": duration_ms,
        "pdf_url": "/files/pdf" if success else None,
    }
```

### api/routers/compile.py
```python
from fastapi import APIRouter
from services.compiler import compile_typst

router = APIRouter(prefix="/compile", tags=["compile"])


@router.post("")
async def trigger_compile():
    return await compile_typst()
```

### api/routers/files.py
```python
import os
from pathlib import Path
from typing import Any, Dict, Optional

import aiofiles
from fastapi import APIRouter, Query
from fastapi.responses import FileResponse, JSONResponse

from services.sandbox import resume_root, resolve_read_safe, resolve_write_safe

router = APIRouter(prefix="/files", tags=["files"])


def _build_tree(path: Path, root: Path) -> Dict[str, Any]:
    rel = str(path.relative_to(root))
    if path.is_file():
        return {"name": path.name, "path": rel, "type": "file"}
    children = sorted(
        path.iterdir(),
        key=lambda p: (p.is_file(), p.name),
    )
    return {
        "name": path.name,
        "path": rel,
        "type": "dir",
        "children": [_build_tree(c, root) for c in children if not c.name.startswith(".")],
    }


@router.get("/tree")
async def file_tree():
    root = resume_root()
    src = root / "src"
    assets = root / "assets"
    children = []
    for d in [src, assets]:
        if d.exists():
            children.append(_build_tree(d, root))
    return {"name": "resume", "path": ".", "type": "dir", "children": children}


@router.get("/stat")
async def stat_file(path: str = Query(...)):
    target = resolve_read_safe(path)
    return {"mtime": target.stat().st_mtime}


@router.get("/read")
async def read_file(path: str = Query(...)):
    target = resolve_read_safe(path)
    async with aiofiles.open(target, "r", encoding="utf-8") as f:
        content = await f.read()
    return JSONResponse({"path": path, "content": content})


@router.put("/write")
async def write_file(path: str = Query(...), body: Optional[Dict] = None):
    content = (body or {}).get("content", "")
    target = resolve_write_safe(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    async with aiofiles.open(target, "w", encoding="utf-8") as f:
        await f.write(content)
    return {"ok": True, "path": path}


@router.get("/pdf")
async def get_pdf():
    target = resolve_read_safe("build/resume.pdf")
    return FileResponse(
        str(target),
        media_type="application/pdf",
        headers={"Cache-Control": "no-store"},
    )
```

## Web layer (Next.js + Tailwind + Monaco)

### web/package.json
```json
{
  "name": "resume-platform-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "15.1.6",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@monaco-editor/react": "^4.6.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.5.1",
    "tailwindcss": "^3.4.17",
    "typescript": "^5"
  }
}
```

### web/next.config.ts
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

### web/tsconfig.json
```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] },
    "target": "ES2017"
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### web/tailwind.config.ts
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        macos: {
          bg:             "#1e1e1e",
          surface:        "#2d2d2d",
          elevated:       "#3d3d3d",
          border:         "#404040",
          text:           "#ffffff",
          "text-secondary": "#a0a0a0",
          accent:         "#0a84ff",
          "accent-hover": "#0070e0",
          success:        "#30d158",
          error:          "#ff453a",
          warning:        "#ffd60a",
        },
      },
      boxShadow: {
        macos:    "0 2px 8px rgba(0,0,0,0.3), 0 0 1px rgba(0,0,0,0.3)",
        "macos-lg": "0 10px 40px rgba(0,0,0,0.4), 0 0 1px rgba(0,0,0,0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
```

### web/postcss.config.js
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### web/app/globals.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: dark;
}

* {
  box-sizing: border-box;
}

body {
  background: #1e1e1e;
  color: #ffffff;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
}

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #404040; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #555; }
```

### web/app/layout.tsx
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resume Platform",
  description: "Self-hosted Typst resume editor",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### web/app/page.tsx
```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/editor");
}
```

### web/app/editor/page.tsx
```tsx
import Editor from "@/components/Editor";

export default function EditorPage() {
  return <Editor />;
}
```

### web/lib/api.ts
```typescript
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

export type FileNode = {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileNode[];
};

export type CompileResult = {
  success: boolean;
  stderr: string;
  duration_ms: number;
  pdf_url: string | null;
};

export async function fetchTree(): Promise<FileNode> {
  const res = await fetch(`${BASE}/files/tree`);
  if (!res.ok) throw new Error("Failed to fetch file tree");
  return res.json();
}

export async function statFile(path: string): Promise<number> {
  const res = await fetch(`${BASE}/files/stat?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error(`Failed to stat ${path}`);
  const data = await res.json();
  return data.mtime as number;
}

export async function readFile(path: string): Promise<string> {
  const res = await fetch(`${BASE}/files/read?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error(`Failed to read ${path}`);
  const data = await res.json();
  return data.content as string;
}

export async function writeFile(path: string, content: string): Promise<void> {
  const res = await fetch(`${BASE}/files/write?path=${encodeURIComponent(path)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`Failed to write ${path}`);
}

export async function compile(): Promise<CompileResult> {
  const res = await fetch(`${BASE}/compile`, { method: "POST" });
  if (!res.ok) throw new Error("Compile request failed");
  return res.json();
}

export function pdfUrl(): string {
  return `${BASE}/files/pdf?t=${Date.now()}`;
}
```

### web/lib/useCompiler.ts
```typescript
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { compile, writeFile, pdfUrl, CompileResult } from "./api";

export type CompileStatus = "idle" | "saving" | "compiling" | "success" | "error";

export function useCompiler(filePath: string | null) {
  const [status, setStatus]       = useState<CompileStatus>("idle");
  const [result, setResult]       = useState<CompileResult | null>(null);
  const [pdfSrc, setPdfSrc]       = useState<string>("");

  useEffect(() => { setPdfSrc(pdfUrl()); }, []);
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

  const compileOnly = useCallback(async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
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
  }, []);

  return { status, result, pdfSrc, scheduleCompile, compileNow, compileOnly };
}
```

### web/components/Editor/index.tsx
```tsx
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

  const mtimeRef     = useRef<number>(0);
  const lastEditRef  = useRef<number>(0);

  const { status, result, pdfSrc, scheduleCompile, compileNow, compileOnly } =
    useCompiler(selectedFile);

  useEffect(() => {
    fetchTree()
      .then(setTree)
      .catch(() => setLoadError("Could not reach API. Is it running on :8001?"));
  }, []);

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

  useEffect(() => {
    if ((status === "success" || status === "error") && selectedFile) {
      statFile(selectedFile)
        .then((mtime) => { mtimeRef.current = mtime; })
        .catch(() => {});
    }
  }, [status, selectedFile]);

  useEffect(() => {
    if (!selectedFile) return;
    const interval = setInterval(async () => {
      if (Date.now() - lastEditRef.current < 3000) return;
      try {
        const mtime = await statFile(selectedFile);
        if (mtime > mtimeRef.current + 0.001) {
          const text = await readFile(selectedFile);
          setContent(text);
          mtimeRef.current = mtime;
          compileOnly();
        }
      } catch { /* ignore */ }
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

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-52 flex-shrink-0 bg-macos-surface border-r border-macos-border overflow-y-auto">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-widest text-macos-text-secondary border-b border-macos-border">
            Files
          </div>
          <FileTree tree={tree} selected={selectedFile} onSelect={handleSelectFile} />
        </aside>

        <div className="flex flex-col flex-1 overflow-hidden border-r border-macos-border">
          <div className="flex-1 overflow-hidden">
            <MonacoPane value={content} onChange={handleChange} />
          </div>
          <ErrorPanel result={result} />
        </div>

        <div className="flex-1 overflow-hidden bg-macos-elevated">
          <PdfPreview src={pdfSrc} />
        </div>
      </div>
    </div>
  );
}
```

### web/components/Editor/FileTree.tsx
```tsx
"use client";

import type { FileNode } from "@/lib/api";

function TreeNode({
  node,
  selected,
  onSelect,
  depth = 0,
}: {
  node: FileNode;
  selected: string | null;
  onSelect: (path: string) => void;
  depth?: number;
}) {
  if (node.type === "file") {
    const isActive = selected === node.path;
    return (
      <button
        onClick={() => onSelect(node.path)}
        className={`w-full text-left px-3 py-1 text-sm rounded transition-colors truncate ${
          isActive
            ? "bg-macos-accent text-white"
            : "text-macos-text-secondary hover:bg-macos-elevated hover:text-macos-text"
        }`}
        style={{ paddingLeft: `${12 + depth * 12}px` }}
        title={node.path}
      >
        {node.name}
      </button>
    );
  }

  return (
    <div>
      <div
        className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-macos-text-secondary"
        style={{ paddingLeft: `${12 + depth * 12}px` }}
      >
        {node.name}
      </div>
      {node.children?.map((child) => (
        <TreeNode
          key={child.path}
          node={child}
          selected={selected}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

export default function FileTree({
  tree,
  selected,
  onSelect,
}: {
  tree: FileNode | null;
  selected: string | null;
  onSelect: (path: string) => void;
}) {
  if (!tree) {
    return (
      <div className="p-3 text-xs text-macos-text-secondary">Loading…</div>
    );
  }

  return (
    <div className="py-2">
      {tree.children?.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          selected={selected}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
```

### web/components/Editor/MonacoPane.tsx
```tsx
"use client";

import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export default function MonacoPane({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="w-full h-full">
      <MonacoEditor
        height="100%"
        language="plaintext"
        theme="vs-dark"
        value={value}
        onChange={(v) => onChange(v ?? "")}
        options={{
          fontSize: 13,
          fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
          lineHeight: 20,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          renderLineHighlight: "line",
          smoothScrolling: true,
          cursorBlinking: "smooth",
          padding: { top: 12, bottom: 12 },
          tabSize: 2,
        }}
      />
    </div>
  );
}
```

### web/components/Editor/PdfPreview.tsx
```tsx
"use client";

export default function PdfPreview({ src }: { src: string }) {
  if (!src) {
    return (
      <div className="flex items-center justify-center h-full text-macos-text-secondary text-sm">
        <div className="text-center space-y-2">
          <p>No preview yet — edit a file to compile</p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      key={src}
      src={src}
      className="w-full h-full border-0 bg-white"
      title="Resume PDF Preview"
    />
  );
}
```

### web/components/Editor/ErrorPanel.tsx
```tsx
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
```

### web/components/ui/StatusBadge.tsx
```tsx
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
```

## Typst resume template

This is the most important part. The template must produce a **two-column resume** matching the attached PDF. Create three files:

### resume/src/theme.typ
Design constants. Use these values (adjust the purple to match the PDF):
- accent color: purple (#7B2D8E or match the PDF)
- body font: a clean sans-serif available on Windows ("Calibri", "Segoe UI", or "Arial")
- name size: ~18pt
- body size: ~9-10pt
- page margins: tight (top: 0.3in, bottom: 0.3in, left: 0.3in, right: 0.3in)
- sidebar width: ~30% of page

### resume/src/sections.typ
Macro library. Must include these layout functions:
- `resume-layout(sidebar, main)` — two-column page layout (sidebar left, main right)
- `resume-header(name, subtitle, email)` — large purple name + subtitle + email row (spans top of main column)
- `sidebar-photo(path)` — circular-cropped profile photo
- `sidebar-quote(text, author)` — italic quote block
- `sidebar-section(title, body)` — bold uppercase section header for sidebar
- `sidebar-bullets(..items)` — bullet list for sidebar
- `sidebar-skills(..pairs)` — two mini-columns for technical skills
- `main-section(title, body)` — bold uppercase section header for main area (like "PROJECT EXPERIENCE")
- `strengths-box(..items)` — dashed-border box with numbered strengths in a grid
- `role(company, subtitle, body)` — job entry with bold company, italic subtitle, dashed separator
- `bullets(..items)` — standard bullet list for job descriptions

### resume/src/resume.typ
Content only — extract ALL text from the attached PDF and structure it using the macros above. Include every section: header, capabilities, technical skills, education, interests, project experience entries, and strengths.

**IMPORTANT:** The photo path should reference `../assets/photo.jpg`. I'll place my headshot there manually.

## Windows-specific notes

1. **TYPST_PATH:** On Windows after `winget install typst`, the binary is just `typst` on PATH. If installed manually, set `TYPST_PATH=C:\path\to\typst.exe` as an environment variable.
2. **Python venv:** Use `python -m venv .venv` then `.venv\Scripts\activate` (not `source .venv/bin/activate`)
3. **Running the API:** `cd api && .venv\Scripts\activate && set TYPST_PATH=typst && set RESUME_ROOT=..\resume && python main.py`
4. **Running the web:** `cd web && set NEXT_PUBLIC_API_URL=http://localhost:8001 && npm run dev -- -p 3030`
5. **Path separators:** The sandbox.py and compiler.py use pathlib.Path which handles Windows paths automatically. No changes needed.
6. **Fonts:** Windows has Calibri and Segoe UI built-in — prefer these over macOS-specific fonts in the Typst template.

## Setup steps

1. Create all the directories and files listed above
2. `cd api && python -m venv .venv && .venv\Scripts\activate && pip install -r requirements.txt`
3. `cd web && npm install`
4. Place a headshot photo at `resume/assets/photo.jpg`
5. Start the API: `cd api && set RESUME_ROOT=..\resume && python main.py`
6. In another terminal, start the web: `cd web && set NEXT_PUBLIC_API_URL=http://localhost:8001 && npm run dev -- -p 3030`
7. Open http://localhost:3030 — you should see the editor with live PDF preview
8. Manually compile once to verify: `typst compile resume/src/resume.typ resume/build/resume.pdf`

## Critical patterns (do not break these)

- Monaco MUST use `dynamic(() => import("@monaco-editor/react"), { ssr: false })` — never import directly
- `pdfUrl()` MUST append `?t=Date.now()` as cache-buster
- `writeFile` MUST be awaited before `compile()` — never parallelize
- `<iframe key={src}>` is the reload mechanism — the key change forces full reload
- sandbox.py blocks ALL writes outside `src/` and `assets/` — `build/` is compiler-only
- The 700ms debounce in useCompiler prevents compile spam during typing
```
