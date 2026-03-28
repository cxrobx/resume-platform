from fastapi import APIRouter, Query
from services.compiler import compile_typst

router = APIRouter(prefix="/compile", tags=["compile"])


@router.post("")
async def trigger_compile(resume: str = Query("default")):
    """Compile resume.typ -> build/resume.pdf for a specific resume project."""
    return await compile_typst(resume)
