"""
Path sandboxing — all file ops must go through these functions.
No path ever escapes RESUME_ROOT.
"""
import os
from pathlib import Path
from typing import Optional
from fastapi import HTTPException

# Populated by main.py at startup
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
    """
    Resolve rel_path relative to RESUME_ROOT and ensure it stays inside.
    Raises HTTPException(400) on traversal attempt.
    """
    root = resume_root()
    try:
        target = (root / rel_path).resolve()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid path")
    if not str(target).startswith(str(root)):
        raise HTTPException(status_code=400, detail="Path traversal denied")
    return target


def resolve_read_safe(rel_path: str) -> Path:
    """Resolve for reading — must exist."""
    target = resolve_safe(rel_path)
    if not target.exists():
        raise HTTPException(status_code=404, detail=f"Not found: {rel_path}")
    return target


def resolve_write_safe(rel_path: str) -> Path:
    """
    Resolve for writing — path must be inside src/ or assets/.
    build/ is compiler-only output and never writable via API.
    """
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
