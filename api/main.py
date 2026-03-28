import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.sandbox import set_resumes_base
from routers import compile, files, resumes

RESUMES_BASE = os.environ.get("RESUMES_BASE", "../resumes")
API_PORT     = int(os.environ.get("API_PORT", 8001))

# Auto-migrate from single-resume layout if needed
_old_root = os.environ.get("RESUME_ROOT")
if _old_root and not os.path.isdir(RESUMES_BASE):
    from migrate import migrate_to_multi_resume
    migrate_to_multi_resume(_old_root, RESUMES_BASE)

# Initialise sandbox before any route can run
set_resumes_base(RESUMES_BASE)

app = FastAPI(title="Resume Platform API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # single-user local tool — broad is fine
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(compile.router)
app.include_router(files.router)
app.include_router(resumes.router)


@app.get("/health")
async def health():
    return {"ok": True}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=API_PORT, reload=False)
