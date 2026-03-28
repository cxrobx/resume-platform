const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

export type FileNode = {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileNode[];
};

export type CompileResult = {
  success: boolean;
  stderr: string;
  duration_ms: number;
  pdf_url: string | null;
};

/* ── Resume CRUD ──────────────────────────────────────────────────── */

export async function fetchResumes(): Promise<string[]> {
  const res = await fetch(`${BASE}/resumes`);
  if (!res.ok) throw new Error("Failed to fetch resumes");
  const data = await res.json();
  return data.resumes as string[];
}

export async function createResume(name: string, copyFrom?: string): Promise<void> {
  const res = await fetch(`${BASE}/resumes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, copy_from: copyFrom }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to create resume");
  }
}

export async function renameResume(name: string, newName: string): Promise<void> {
  const res = await fetch(`${BASE}/resumes/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ new_name: newName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to rename resume");
  }
}

export async function deleteResume(name: string): Promise<void> {
  const res = await fetch(`${BASE}/resumes/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to delete resume");
  }
}

/* ── File operations ──────────────────────────────────────────────── */

export async function fetchTree(resume: string): Promise<FileNode> {
  const res = await fetch(`${BASE}/files/tree?resume=${encodeURIComponent(resume)}`);
  if (!res.ok) throw new Error("Failed to fetch file tree");
  return res.json();
}

export async function statFile(resume: string, path: string): Promise<number> {
  const res = await fetch(
    `${BASE}/files/stat?resume=${encodeURIComponent(resume)}&path=${encodeURIComponent(path)}`
  );
  if (!res.ok) throw new Error(`Failed to stat ${path}`);
  const data = await res.json();
  return data.mtime as number;
}

export async function readFile(resume: string, path: string): Promise<string> {
  const res = await fetch(
    `${BASE}/files/read?resume=${encodeURIComponent(resume)}&path=${encodeURIComponent(path)}`
  );
  if (!res.ok) throw new Error(`Failed to read ${path}`);
  const data = await res.json();
  return data.content as string;
}

export async function writeFile(resume: string, path: string, content: string): Promise<void> {
  const res = await fetch(
    `${BASE}/files/write?resume=${encodeURIComponent(resume)}&path=${encodeURIComponent(path)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }
  );
  if (!res.ok) throw new Error(`Failed to write ${path}`);
}

/* ── Compile ──────────────────────────────────────────────────────── */

export async function compile(resume: string): Promise<CompileResult> {
  const res = await fetch(`${BASE}/compile?resume=${encodeURIComponent(resume)}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Compile request failed");
  return res.json();
}

/** Cache-busted PDF URL — key forces iframe reload */
export function pdfUrl(resume: string): string {
  return `${BASE}/files/pdf?resume=${encodeURIComponent(resume)}&t=${Date.now()}`;
}
