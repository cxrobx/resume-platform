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
async def file_tree(resume: str = Query("default")):
    """Return recursive directory tree of a resume project (excluding build/)."""
    root = resume_root(resume)
    src = root / "src"
    assets = root / "assets"
    children = []
    for d in [src, assets]:
        if d.exists():
            children.append(_build_tree(d, root))
    return {"name": resume, "path": ".", "type": "dir", "children": children}


@router.get("/stat")
async def stat_file(path: str = Query(...), resume: str = Query("default")):
    """Return file modification time without reading content."""
    target = resolve_read_safe(resume, path)
    return {"mtime": target.stat().st_mtime}


@router.get("/read")
async def read_file(path: str = Query(...), resume: str = Query("default")):
    """Read a file from a resume project. path is relative to resume root."""
    target = resolve_read_safe(resume, path)
    async with aiofiles.open(target, "r", encoding="utf-8") as f:
        content = await f.read()
    return JSONResponse({"path": path, "content": content})


@router.put("/write")
async def write_file(path: str = Query(...), body: Optional[Dict] = None, resume: str = Query("default")):
    """Write content to a file inside src/ or assets/."""
    content = (body or {}).get("content", "")
    target = resolve_write_safe(resume, path)
    target.parent.mkdir(parents=True, exist_ok=True)
    async with aiofiles.open(target, "w", encoding="utf-8") as f:
        await f.write(content)
    return {"ok": True, "path": path}


@router.get("/pdf")
async def get_pdf(resume: str = Query("default")):
    """Serve the compiled PDF for a resume project."""
    target = resolve_read_safe(resume, "build/resume.pdf")
    return FileResponse(
        str(target),
        media_type="application/pdf",
        headers={"Cache-Control": "no-store"},
    )
