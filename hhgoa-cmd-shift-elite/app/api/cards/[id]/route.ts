import { NextResponse } from "next/server";
import { loadCard } from "@/lib/card-store";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!/^[a-f0-9]{12}$/.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const card = await loadCard(id);
  if (!card) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(card.data), {
    headers: {
      "Content-Type": card.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
