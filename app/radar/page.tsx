import type { Metadata } from "next";
import Link from "next/link";
import { RankBadge } from "@/components/ui/RankBadge";
import { formatViews } from "@/lib/format";
import type { LeaderboardEntry } from "@/lib/types";
import radarEntries from "@/lib/data/radar.json";
import leaderboardFallback from "@/lib/data/leaderboard-top.json";
import { fetchUpstreamJson } from "@/lib/proxy";

export const metadata: Metadata = {
  title: "W Celeb Radar | HH GOA",
};

function mergeLiveTop(
  all: LeaderboardEntry[],
  live: LeaderboardEntry[],
): LeaderboardEntry[] {
  if (!live.length) return all;
  const byName = new Map(live.map((entry) => [entry.name, entry]));
  return all.map((entry) => {
    const fresh = byName.get(entry.name);
    return fresh ? { ...entry, ...fresh, id: entry.id } : entry;
  });
}

export default async function RadarPage() {
  const live = await fetchUpstreamJson<{ entries: LeaderboardEntry[] }>(
    "/api/leaderboard",
    leaderboardFallback,
  );
  const entries = mergeLiveTop(radarEntries as LeaderboardEntry[], live.entries ?? []);

  return (
    <div className="min-h-screen bg-brand-offwhite">
      <header className="sticky top-0 z-10 bg-brand-primary text-brand-white">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
          <span className="font-heading font-bold uppercase tracking-wide text-[15px]">
            HH GOA <span className="text-brand-accent">·</span> W Celeb Radar
          </span>
          <Link
            className="font-body text-[13px] uppercase tracking-wide text-brand-offwhite/90 hover:text-brand-accent transition-colors"
            href="/#leaderboard"
          >
            ← Back to home
          </Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 sm:px-10 py-14 sm:py-20">
        <div className="mb-10">
          <p className="font-heading font-extrabold uppercase tracking-[0.1em] text-brand-pink text-[14px] mb-3">
            Task #1
          </p>
          <h1 className="font-heading font-bold uppercase text-brand-primary text-[44px] sm:text-[56px] leading-[1.02] mb-4 text-wrap-balance">
            W Celeb Radar
          </h1>
          <p className="font-body text-black/70 text-[14.5px] leading-relaxed max-w-[60ch]">
            Every team on the board, ranked by score — not just the top 5 shown on the homepage.
          </p>
        </div>
        <div className="border border-black/10 rounded-lg bg-white/40 p-6 sm:p-7">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[560px]">
              <thead>
                <tr className="border-b border-black/15">
                  <th className="text-left font-heading text-brand-primary text-[11px] uppercase tracking-wide pb-3 pr-2 w-10">
                    #
                  </th>
                  <th className="text-left font-heading text-brand-primary text-[11px] uppercase tracking-wide pb-3 pr-2">
                    Name
                  </th>
                  <th className="text-left font-heading text-brand-primary text-[11px] uppercase tracking-wide pb-3 pr-2">
                    X / LinkedIn
                  </th>
                  <th className="text-left font-heading text-brand-primary text-[11px] uppercase tracking-wide pb-3 pr-2">
                    Post
                  </th>
                  <th className="text-right font-heading text-brand-primary text-[11px] uppercase tracking-wide pb-3 pr-2">
                    Views
                  </th>
                  <th className="text-right font-heading text-brand-primary text-[11px] uppercase tracking-wide pb-3">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => {
                  const rank = index + 1;
                  return (
                    <tr key={entry.id} className="border-b border-black/10 last:border-b-0">
                      <td className="py-3 pr-2">
                        <RankBadge rank={rank} />
                      </td>
                      <td className="py-3 pr-2 font-heading font-bold text-brand-primary text-[14px] whitespace-nowrap">
                        {entry.name}
                      </td>
                      <td className="py-3 pr-2">
                        <a
                          href={entry.socialLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-body text-[12.5px] text-brand-pink underline underline-offset-2 hover:opacity-80"
                        >
                          Profile ↗
                        </a>
                      </td>
                      <td className="py-3 pr-2">
                        <a
                          href={entry.postLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-body text-[12.5px] text-brand-pink underline underline-offset-2 hover:opacity-80"
                        >
                          View Post ↗
                        </a>
                      </td>
                      <td className="py-3 pr-2 text-right font-heading font-bold text-black/80 text-[14px] tabular-nums whitespace-nowrap">
                        {formatViews(entry.views)}
                      </td>
                      <td className="py-3 text-right font-heading font-bold text-brand-primary text-[14px] tabular-nums">
                        {entry.score}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <footer className="bg-brand-primary text-brand-offwhite/80">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="font-body text-[13px]">© 2026 HH-Goa. All rights reserved.</p>
          <Link className="font-body text-[13px] hover:text-brand-accent transition-colors" href="/">
            ← Back to home
          </Link>
        </div>
      </footer>
    </div>
  );
}
