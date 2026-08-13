"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RankBadge } from "@/components/ui/RankBadge";
import { formatViews } from "@/lib/format";
import type { LeaderboardEntry } from "@/lib/types";
import leaderboardFallback from "@/lib/data/leaderboard-top.json";

function RadarTable({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <table className="w-full border-collapse">
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
              <td className="py-3 pr-2 font-heading font-bold text-brand-primary text-[14px]">
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
              <td className="py-3 pr-2 text-right font-heading font-bold text-black/80 text-[14px] tabular-nums">
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
  );
}

export function LeaderboardPreview() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/leaderboard", { cache: "no-store" });
        if (!res.ok) throw new Error("bad response");
        const data = (await res.json()) as { entries?: LeaderboardEntry[] };
        if (!cancelled && data.entries) {
          setEntries(data.entries);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setEntries(leaderboardFallback.entries);
          setLoaded(true);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      id="leaderboard"
      aria-label="W Celeb Radar"
      className="w-full h-full flex flex-col items-center justify-center bg-brand-primary px-6"
    >
      <div className="flex flex-col items-center gap-8 max-w-[1440px] w-full">
        <div className="text-center">
          <h2 className="font-heading font-bold uppercase text-brand-white text-[42px] leading-[1.05]">
            W Celeb Radar
          </h2>
        </div>
        <div className="bg-brand-offwhite rounded-lg px-8 py-8 w-full max-w-[760px] shadow-[8px_10px_0_rgba(0,0,0,0.25)]">
          {loaded && entries.length > 0 ? (
            <RadarTable entries={entries} />
          ) : (
            <p className="font-body text-black/50 text-[13.5px] text-center py-6">
              W Celeb Radar opens once submissions start rolling in.
            </p>
          )}
        </div>
        <Link
          href="/radar"
          className="font-heading font-bold uppercase text-[13px] text-brand-white/90 underline underline-offset-4 hover:text-brand-accent transition-colors"
        >
          View Full Radar ↗
        </Link>
      </div>
    </section>
  );
}

export { RadarTable };
