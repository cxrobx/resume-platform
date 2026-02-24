from fastapi import APIRouter
from services.compiler import compile_typst

router = APIRouter(prefix="/compile", tags=["compile"])


@router.post("")
async def trigger_compile():
    """Compile resume.typ → build/resume.pdf and return result."""
    return await compile_typst()
