# Resume Platform

Self-hosted Typst resume editor ("Overleaf-lite").
Monaco editor + PDF preview + auto-compile, backed by FastAPI → Typst CLI.
Supports multiple resume projects — each with its own `src/`, `build/`, and `assets/` directories.

## Ports

| Service | Local | NAS |
|---------|-------|-----|
| FastAPI | 8001  | 18850 |
| Next.js | 3030  | 18851 |

## Local Dev

```bash
# Terminal 1 — API
cd ~/Projects/resume-platform/api
source .venv/bin/activate          # venv already created; if missing: python3 -m venv .venv && pip install -r requirements.txt
TYPST_PATH=/opt/homebrew/bin/typst RESUMES_BASE=../resumes python3 main.py

# Terminal 2 — Web
cd ~/Projects/resume-platform/web
NEXT_PUBLIC_API_URL=http://localhost:8001 npm run dev -- -p 3030
```

Typst binary: `/opt/homebrew/bin/typst` (v0.14.2). Do not change unless upgrading.
Python runtime: 3.9 — use `Optional[X]` not `X | None`, and `Dict`/`List` from `typing` not built-in generics.

## Project Structure

```
resume-platform/
├── resumes/                         ← RESUMES_BASE — each subdirectory is one resume project
│   ├── default/                     ← The primary resume
│   │   ├── src/
│   │   │   ├── resume.typ           ← Content only. Edit this to update the resume.
│   │   │   ├── theme.typ            ← Visual constants (fonts, colors, sizes). Edit for branding.
│   │   │   └── sections.typ         ← Macro library. Edit to change layout/structure.
│   │   ├── build/                   ← Gitignored. Compiler writes resume.pdf here.
│   │   └── assets/fonts/            ← Drop custom .ttf/.otf fonts here; reference in theme.typ
│   └── _template/                   ← Scaffold for POST /resumes (hidden from listing)
│       ├── src/resume.typ, theme.typ, sections.typ
│       └── assets/fonts/
├── api/
│   ├── main.py                      ← FastAPI app entry. Sets RESUMES_BASE, registers routers.
│   ├── migrate.py                   ← One-time migration: resume/ → resumes/default/
│   ├── routers/
│   │   ├── compile.py               ← POST /compile
│   │   ├── files.py                 ← GET /files/tree, /files/read, /files/stat, PUT /files/write, GET /files/pdf
│   │   └── resumes.py               ← GET /resumes, POST /resumes, DELETE /resumes/{name}
│   └── services/
│       ├── sandbox.py               ← Path traversal prevention. ALL file ops go through here.
│       └── compiler.py              ← asyncio subprocess wrapper for `typst compile`. 15s timeout.
├── web/
│   ├── app/editor/page.tsx          ← Entry point, renders <Editor />
│   ├── components/Editor/
│   │   ├── index.tsx                ← 3-panel shell + resume state. State lives here.
│   │   ├── ResumeSelector.tsx       ← Dropdown for switching/creating/deleting resume projects
│   │   ├── FileTree.tsx             ← Recursive file tree, calls onSelect(path)
│   │   ├── MonacoPane.tsx           ← dynamic import of @monaco-editor/react, ssr:false
│   │   ├── PdfPreview.tsx           ← <iframe key={src}> — key change forces reload on new compile
│   │   └── ErrorPanel.tsx           ← Shows stderr when compile fails
│   ├── lib/
│   │   ├── api.ts                   ← All fetch calls. Every function takes `resume` as first param.
│   │   └── useCompiler.ts           ← 700ms debounce hook: writeFile → compile (sequential, no race)
│   └── components/ui/
│       └── StatusBadge.tsx          ← idle / saving / compiling / success / error indicator
├── launcher/                        ← Electron launcher (legacy)
│   └── main.js
└── launcher-swift/                  ← Native macOS launcher → /Applications/Resume Editor.app
    ├── ResumeEditor.swift
    └── build.sh
```

## Typst Resume Files

### theme.typ — Visual Constants
The **only** file to touch for branding. Contains:
- `accent` — color for section headings (dark navy `#1a1a2e`)
- `rule-color` — horizontal rule color
- `muted` — gray for sub-text
- `body-font` — `("New Computer Modern",)` — matches LaTeX default
- `name-size`, `section-size`, `body-size`, `page-margins`

### sections.typ — Macro Library
Do not put content here. Contains reusable layout functions:

| Macro | Signature | Purpose |
|-------|-----------|---------|
| `resume-header` | `(name:, address:, contact:)` | Centered name + contact line |
| `section` | `(title, body)` | Bold uppercase title + hr + indented body |
| `role` | `(company:, info:?, title:?, date:?, body)` | Job entry with optional subtitle row |
| `bullets` | `(..items)` | Bullet list using `·` marker |
| `skills-table` | `(..("Label", "Values") pairs)` | Two-column bold-label table |
| `note` | `(body)` | Small gray text for sub-info |

### resume.typ — Content
Purely declarative. Imports both helpers and calls macros. Structure:
1. `#resume-header(...)` — name/contact at top
2. `#section("Education", [...])` containing `#role(...)` blocks
3. `#section("Work Experience", [...])` containing `#role(...)[#bullets(...)]` blocks
4. `#section("Volunteer Experience", [...])` same pattern
5. `#section("Technical Strengths", [...])` containing `#skills-table(...)`

**To add a new job:** copy an existing `#role(...)` block and fill in the args. Date goes in `date:`, company in `company:`.

**To add a new section:** `#section("Title", [#role(...)[#bullets(...)]])`

**To compile manually:**
```bash
/opt/homebrew/bin/typst compile resumes/default/src/resume.typ resumes/default/build/resume.pdf
```

## API Endpoints

All file/compile endpoints accept `?resume=<name>` (defaults to `"default"`).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness check |
| GET | `/resumes` | List all resume projects → `{"resumes": ["default", ...]}` |
| POST | `/resumes` | Create resume project (body: `{"name": "...", "copy_from": "..."}`) |
| DELETE | `/resumes/{name}` | Delete a resume project (cannot delete `"default"`) |
| GET | `/files/tree?resume=default` | Recursive tree of `src/` and `assets/` |
| GET | `/files/read?resume=default&path=src/resume.typ` | Read file content |
| GET | `/files/stat?resume=default&path=src/resume.typ` | File modification time |
| PUT | `/files/write?resume=default&path=src/resume.typ` | Write file (body: `{"content": "..."}`) — only `src/` and `assets/` allowed |
| GET | `/files/pdf?resume=default` | Serve compiled PDF (`Cache-Control: no-store`) |
| POST | `/compile?resume=default` | Run `typst compile` → `{"success", "stderr", "duration_ms", "pdf_url"}` |

### Security: sandbox.py
- `validate_resume_name(name)` — regex `^[a-zA-Z0-9_-]+$`, raises 400 on bad input
- `resume_root(name)` — resolves resume directory, checks traversal + existence
- `resolve_safe(resume, rel_path)` — resolves relative to resume root, raises 400 on traversal
- `resolve_read_safe(resume, rel_path)` — same + raises 404 if file missing
- `resolve_write_safe(resume, rel_path)` — same + raises 403 if not inside `src/` or `assets/`
- `build/` directory is **compiler-only output** — never writable via API

## Web UI Architecture

**State flow in `Editor/index.tsx`:**
1. On mount: `fetchResumes()` → populate resume list; load `currentResume` from `localStorage`
2. On resume change: `fetchTree(resume)` → populate file tree; `readFile(resume, DEFAULT_FILE)` → populate Monaco; `compileNow()` → populate PDF preview
3. On file select: `readFile(resume, path)` → update Monaco content
4. On Monaco change: `scheduleCompile(content)` → debounced 700ms
5. Debounce fires: `writeFile(resume, path, content)` → `compile(resume)` → on success: `setPdfSrc(pdfUrl(resume))`
6. `pdfSrc` change updates `<iframe key={src}>` → key change = full iframe reload (cache-bust)

**Critical patterns:**
- Monaco uses `dynamic(..., { ssr: false })` — never remove this, causes `self is not defined` at build
- `pdfUrl(resume)` always appends `?t=Date.now()` — browsers aggressively cache iframes
- `writeFile` always `await`s before `compile()` — never parallelize these
- `key={src}` on `<iframe>` is the reload mechanism — do not replace with `src` mutation
- `useCompiler` tracks `resume` in a ref and discards stale compile results on resume switch
- `useCompiler` fully resets `status`/`result`/`pdfSrc` when resume changes

**Tailwind theme tokens** (from `tailwind.config.ts`):
- `macos-bg` `#1e1e1e` — page background
- `macos-surface` `#2d2d2d` — panels, sidebar
- `macos-elevated` `#3d3d3d` — hover states, PDF panel bg
- `macos-border` `#404040` — dividers
- `macos-accent` `#0a84ff` — compile button, active file
- `macos-success` `#30d158` — compiled status
- `macos-error` `#ff453a` — error status
- `macos-warning` `#ffd60a` — saving status

## Known Gotchas

1. **Python 3.9** — use `Optional[X]` / `Dict` / `List` from `typing`, not `X | None` / `dict[...]` / `list[...]`
2. **Monaco SSR** — `MonacoPane.tsx` uses `dynamic(..., { ssr: false })`. Never import Monaco directly in a server component.
3. **PDF cache** — `pdfUrl(resume)` appends timestamp. Never serve the PDF URL without a cache-buster.
4. **Write-compile race** — `useCompiler.ts` awaits `writeFile` before `compile`. Keep sequential.
5. **Typst Docker arch** — `api/Dockerfile` downloads `x86_64-unknown-linux-musl` for NAS. Do not build this image on Apple Silicon locally — build on NAS or CI.
6. **`build/` writes** — sandbox blocks all API writes to `build/`. Compiler writes there directly via subprocess. This is intentional.
7. **Resume switch race** — `useCompiler` uses a ref-based guard to discard compile results from a previous resume. Do not remove the `resumeRef` check.

## Adding Features

### New resume project
Use the UI's "New Resume" button, or `POST /resumes` with `{"name": "my-resume"}`. Optionally pass `"copy_from": "default"` to clone an existing one. New resumes start from `resumes/_template/`.

### New Typst macro
Add to `sections.typ`, import is already `#import "sections.typ": *` in `resume.typ` — available immediately.

### New API endpoint
Add to `api/routers/files.py` or create a new router file in `api/routers/`. Register it in `main.py` with `app.include_router(...)`. Always use `resolve_safe(resume, path)` / `resolve_read_safe(resume, path)` / `resolve_write_safe(resume, path)` for any path handling.

### New UI panel or component
Add to `web/components/Editor/`. Import in `index.tsx`. All fetch calls go through `web/lib/api.ts` — add new typed wrappers there, not inline in components.

## Launchers

### Swift launcher (primary) — `/Applications/Resume Editor.app`
Built from `launcher-swift/ResumeEditor.swift`. Starts API + Next.js dev servers, waits for health, opens WKWebView.

**Rebuild after code changes:**
```bash
cd launcher-swift && bash build.sh
cp -r "dist/Resume Editor.app" "/Applications/Resume Editor.app"
```

### Electron launcher (legacy)
In `launcher/`. Uses `main.js` to spawn servers via `child_process`. Kept for reference.

## Slash Commands

| Command | Description |
|---------|-------------|
| `/deploy [message]` | Stage, commit, and push to NAS. Hook auto-detects content-only vs code changes. |

## Git Workflow (local ↔ NAS sync)

Remote: `nas` → `ssh://cx@192.168.4.22:2233/volume2/docker/git/resume-platform.git`

```bash
git push nas main
```

The `post-receive` hook on the NAS handles deployment automatically:
- **Content-only changes** (`resumes/`): checked out immediately, live via volume mount — no rebuild.
- **Code changes** (`api/`, `web/`, `compose.yaml`): containers are rebuilt and restarted automatically.

```bash
# Typical resume edit workflow:
git add resumes/default/src/resume.typ
git commit -m "update work experience"
git push nas main          # live on NAS in seconds, no rebuild
```

```bash
# Code change workflow (triggers rebuild, takes ~2 min):
git add api/ web/
git commit -m "add new API endpoint"
git push nas main
```

## NAS Deploy (first time / from scratch)

```bash
# 1. Build images (must be done on NAS or CI — not Apple Silicon)
docker compose build

# 2. Transfer to NAS
docker save resume-platform-resume-api resume-platform-resume-web | \
  ssh -p 2233 -i ~/.ssh/id_ed25519_nas cx@192.168.4.22 "/usr/local/bin/docker load"

# 3. Copy resume source files
ssh -p 2233 -i ~/.ssh/id_ed25519_nas cx@192.168.4.22 \
  "mkdir -p /volume2/docker/resume-platform/resumes"
scp -P 2233 -r resumes/ cx@192.168.4.22:/volume2/docker/resume-platform/resumes/

# 4. Start services
ssh -p 2233 -i ~/.ssh/id_ed25519_nas cx@192.168.4.22 \
  "cd /volume2/docker/resume-platform && /usr/local/bin/docker compose up -d"

# 5. Verify
curl http://192.168.4.22:18850/health
curl http://192.168.4.22:18850/resumes
# Web UI: http://192.168.4.22:18851
```

NAS env overrides are in `.env.nas`. The `compose.yaml` uses `API_PORT` and `WEB_PORT` env vars.
