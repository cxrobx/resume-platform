"""
Typst subprocess wrapper.
Runs: typst compile <entry> <output> with a hard 15-second timeout.
"""
import asyncio
import os
import time
from pathlib import Path

from services.sandbox import resume_root

TYPST_PATH = os.environ.get("TYPST_PATH", "typst")
COMPILE_TIMEOUT = 15  # seconds
ENTRY_FILE = "src/resume.typ"
OUTPUT_FILE = "build/resume.pdf"


async def compile_typst(resume: str) -> dict:
    """
    Returns {"success": bool, "stderr": str, "duration_ms": int, "pdf_url": str | None}
    """
    root = resume_root(resume)
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
                "stderr": "Compile timed out after %ds" % COMPILE_TIMEOUT,
                "duration_ms": int((time.monotonic() - start) * 1000),
                "pdf_url": None,
            }
    except FileNotFoundError:
        return {
            "success": False,
            "stderr": "Typst not found at %r. Check TYPST_PATH env var." % TYPST_PATH,
            "duration_ms": int((time.monotonic() - start) * 1000),
            "pdf_url": None,
        }

    duration_ms = int((time.monotonic() - start) * 1000)
    success = proc.returncode == 0

    return {
        "success": success,
        "stderr": stderr.decode("utf-8", errors="replace").strip(),
        "duration_ms": duration_ms,
        "pdf_url": "/files/pdf?resume=%s" % resume if success else None,
    }
