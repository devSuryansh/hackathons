import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { saveCard } from "@/lib/card-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing image" }, { status: 400 });
  }
  if (file.size > 8_000_000) {
    return NextResponse.json({ error: "Image too large" }, { status: 413 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const id = randomBytes(6).toString("hex");
  await saveCard(id, bytes);
  return NextResponse.json({ id });
}
