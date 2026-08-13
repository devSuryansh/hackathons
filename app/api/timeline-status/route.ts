import timelineFallback from "@/lib/data/timeline-status.json";
import { fetchUpstreamJson } from "@/lib/proxy";

export async function GET() {
  const data = await fetchUpstreamJson("/api/timeline-status", timelineFallback);
  return Response.json(data);
}
