import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Stored = { data: Buffer; contentType: string };

const memory = new Map<string, Stored>();

function dir(): string {
  return process.env.VERCEL ? "/tmp/cards" : path.join(process.cwd(), "data", "cards");
}

export function sniffType(data: Buffer): string {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return "image/jpeg";
  }
  return "image/png";
}

export async function saveCard(id: string, data: Buffer): Promise<void> {
  const contentType = sniffType(data);
  memory.set(id, { data, contentType });

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    await put(`hhgoa-cards/${id}`, data, {
      access: "public",
      addRandomSuffix: false,
      contentType,
    });
    return;
  }

  const folder = dir();
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, `${id}.bin`), data);
}

export async function loadCard(id: string): Promise<Stored | null> {
  const hit = memory.get(id);
  if (hit) return hit;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: `hhgoa-cards/${id}`, limit: 1 });
    const url = blobs[0]?.url;
    if (!url) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = Buffer.from(await res.arrayBuffer());
    const stored = { data, contentType: sniffType(data) };
    memory.set(id, stored);
    return stored;
  }

  try {
    const data = await readFile(path.join(dir(), `${id}.bin`));
    const stored = { data, contentType: sniffType(data) };
    memory.set(id, stored);
    return stored;
  } catch {
    return null;
  }
}
