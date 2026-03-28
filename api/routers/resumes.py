import shutil
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.sandbox import resumes_base, validate_resume_name, list_resumes, resume_root

router = APIRouter(prefix="/resumes", tags=["resumes"])


class CreateResumeBody(BaseModel):
    name: str
    copy_from: Optional[str] = None


class RenameResumeBody(BaseModel):
    new_name: str


@router.get("")
async def get_resumes():
    """List all resume projects."""
    return {"resumes": list_resumes()}


@router.post("")
async def create_resume(body: CreateResumeBody):
    """Create a new resume project, optionally copying from an existing one."""
    name = validate_resume_name(body.name.lower())
    base = resumes_base()
    target = base / name
    if target.exists():
        raise HTTPException(status_code=409, detail="Resume already exists: %s" % name)

    if body.copy_from:
        source = resume_root(body.copy_from)
        shutil.copytree(str(source), str(target))
        # Clear build in the copy — force fresh compile
        build_dir = target / "build"
        if build_dir.exists():
            shutil.rmtree(str(build_dir))
        build_dir.mkdir()
    else:
        template = base / "_template"
        if template.is_dir():
            shutil.copytree(str(template), str(target))
        else:
            # Minimal scaffold when no template exists
            (target / "src").mkdir(parents=True)
            (target / "build").mkdir(parents=True)
            (target / "assets" / "fonts").mkdir(parents=True)
            (target / "src" / "resume.typ").write_text(
                '#import "sections.typ": *\n#import "theme.typ": *\n\n// Start your resume here\n'
            )

    return {"ok": True, "name": name}


@router.put("/{name}")
async def rename_resume(name: str, body: RenameResumeBody):
    """Rename a resume project. Cannot rename 'default'."""
    validate_resume_name(name)
    if name == "default":
        raise HTTPException(status_code=403, detail="Cannot rename the default resume")
    new_name = validate_resume_name(body.new_name.lower())
    if new_name == name:
        return {"ok": True, "name": new_name}
    base = resumes_base()
    source = base / name
    if not source.is_dir():
        raise HTTPException(status_code=404, detail="Resume not found: %s" % name)
    target = base / new_name
    if target.exists():
        raise HTTPException(status_code=409, detail="Resume already exists: %s" % new_name)
    source.rename(target)
    return {"ok": True, "name": new_name}


@router.delete("/{name}")
async def delete_resume(name: str):
    """Delete a resume project. Cannot delete 'default'."""
    validate_resume_name(name)
    if name == "default":
        raise HTTPException(status_code=403, detail="Cannot delete the default resume")
    base = resumes_base()
    target = base / name
    if not target.is_dir():
        raise HTTPException(status_code=404, detail="Resume not found: %s" % name)
    shutil.rmtree(str(target))
    return {"ok": True}
