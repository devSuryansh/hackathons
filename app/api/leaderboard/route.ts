import leaderboardFallback from "@/lib/data/leaderboard-top.json";
import { fetchUpstreamJson } from "@/lib/proxy";
import type { LeaderboardEntry } from "@/lib/types";

export async function GET() {
  const data = await fetchUpstreamJson<{ entries: LeaderboardEntry[] }>(
    "/api/leaderboard",
    leaderboardFallback,
  );
  const entries = (data.entries ?? []).slice(0, 5);
  return Response.json({ entries });
}
