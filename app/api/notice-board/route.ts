import noticesFallback from "@/lib/data/notices.json";
import { fetchUpstreamJson } from "@/lib/proxy";

export async function GET() {
  const data = await fetchUpstreamJson("/api/notice-board", noticesFallback);
  return Response.json(data);
}
