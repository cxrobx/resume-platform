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

export async function fetchTree(): Promise<FileNode> {
  const res = await fetch(`${BASE}/files/tree`);
  if (!res.ok) throw new Error("Failed to fetch file tree");
  return res.json();
}

export async function statFile(path: string): Promise<number> {
  const res = await fetch(`${BASE}/files/stat?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error(`Failed to stat ${path}`);
  const data = await res.json();
  return data.mtime as number;
}

export async function readFile(path: string): Promise<string> {
  const res = await fetch(`${BASE}/files/read?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error(`Failed to read ${path}`);
  const data = await res.json();
  return data.content as string;
}

export async function writeFile(path: string, content: string): Promise<void> {
  const res = await fetch(`${BASE}/files/write?path=${encodeURIComponent(path)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`Failed to write ${path}`);
}

export async function compile(): Promise<CompileResult> {
  const res = await fetch(`${BASE}/compile`, { method: "POST" });
  if (!res.ok) throw new Error("Compile request failed");
  return res.json();
}

/** Cache-busted PDF URL — key forces iframe reload */
export function pdfUrl(): string {
  return `${BASE}/files/pdf?t=${Date.now()}`;
}
