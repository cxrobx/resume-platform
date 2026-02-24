import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.sandbox import set_resume_root
from routers import compile, files

RESUME_ROOT = os.environ.get("RESUME_ROOT", "../resume")
API_PORT    = int(os.environ.get("API_PORT", 8001))

# Initialise sandbox before any route can run
set_resume_root(RESUME_ROOT)

app = FastAPI(title="Resume Platform API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # single-user local tool — broad is fine
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
