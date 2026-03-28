"""
Path sandboxing — all file ops must go through these functions.
No path ever escapes a resume's root directory.
"""
import os
import re
from pathlib import Path
from typing import List, Optional
from fastapi import HTTPException

# Populated by main.py at startup
_resumes_base: Optional[Path] = None

WRITE_ALLOWED_DIRS = {"src", "assets"}
RESUME_NAME_RE = re.compile(r'^[a-zA-Z0-9_-]+$')


def set_resumes_base(path: str) -> None:
    global _resumes_base
    _resumes_base = Path(path).resolve()


def resumes_base() -> Path:
    if _resumes_base is None:
        raise RuntimeError("sandbox not initialised")
    return _resumes_base


def validate_resume_name(name: str) -> str:
    """Validate and return the resume name. Raises 400 on bad input."""
    if not name or not RESUME_NAME_RE.match(name):
        raise HTTPException(status_code=400, detail="Invalid resume name: %r" % name)
    return name


def list_resumes() -> List[str]:
    """List all resume project names (excludes _-prefixed and dotfiles)."""
    base = resumes_base()
    if not base.is_dir():
        return []
    return sorted([
        d.name for d in base.iterdir()
        if d.is_dir() and not d.name.startswith("_") and not d.name.startswith(".")
    ])


def resume_root(name: str) -> Path:
    """Return the root directory of a specific resume project."""
    validate_resume_name(name)
    base = resumes_base()
    root = (base / name).resolve()
    if not str(root).startswith(str(base)):
        raise HTTPException(status_code=400, detail="Path traversal denied")
    if not root.is_dir():
        raise HTTPException(status_code=404, detail="Resume not found: %s" % name)
    return root


def resolve_safe(resume: str, rel_path: str) -> Path:
    """
    Resolve rel_path relative to a resume's root and ensure it stays inside.
    Raises HTTPException(400) on traversal attempt.
    """
    root = resume_root(resume)
    try:
        target = (root / rel_path).resolve()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid path")
    if not str(target).startswith(str(root)):
        raise HTTPException(status_code=400, detail="Path traversal denied")
    return target


def resolve_read_safe(resume: str, rel_path: str) -> Path:
    """Resolve for reading — must exist."""
    target = resolve_safe(resume, rel_path)
    if not target.exists():
        raise HTTPException(status_code=404, detail="Not found: %s" % rel_path)
    return target


def resolve_write_safe(resume: str, rel_path: str) -> Path:
    """
    Resolve for writing — path must be inside src/ or assets/.
    build/ is compiler-only output and never writable via API.
    """
    target = resolve_safe(resume, rel_path)
    root = resume_root(resume)
    rel = target.relative_to(root)
    top_dir = rel.parts[0] if rel.parts else ""
    if top_dir not in WRITE_ALLOWED_DIRS:
        raise HTTPException(
            status_code=403,
            detail="Writes only allowed in %s, got: %r" % (WRITE_ALLOWED_DIRS, top_dir),
        )
    return target
