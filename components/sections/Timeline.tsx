"use client";

import { STATUS_STYLES, TIMELINE_ROW_ONE, TIMELINE_ROW_TWO } from "@/lib/constants";
import type { TimelinePhase } from "@/lib/types";
import timelineFallback from "@/lib/data/timeline-status.json";
import { useEffect, useState } from "react";

const NOTCH = "28px";

function DateChip({
  phase,
  direction,
  tone,
}: {
  phase: TimelinePhase;
  direction: "left" | "right";
  tone: "primary" | "pink";
}) {
  return (
    <div
      className={`flex-1 h-[104px] flex items-center justify-center ${tone === "primary" ? "bg-brand-primary" : "bg-brand-pink"}`}
      style={{
        clipPath:
          direction === "right"
            ? `polygon(0 0, calc(100% - ${NOTCH}) 0, 100% 50%, calc(100% - ${NOTCH}) 100%, 0 100%, ${NOTCH} 50%)`
            : `polygon(100% 0, ${NOTCH} 0, 0 50%, ${NOTCH} 100%, 100% 100%, calc(100% - ${NOTCH}) 50%)`,
        paddingLeft: direction === "right" ? "20px" : "36px",
        paddingRight: direction === "right" ? "36px" : "20px",
      }}
    >
      <span className="font-body font-bold text-brand-white text-center text-[14px] leading-tight uppercase tracking-wide">
        {phase.when}
      </span>
    </div>
  );
}

function PhaseCopy({ phase, status }: { phase: TimelinePhase; status?: string }) {
  return (
    <div className="flex-1 px-3 text-center flex flex-col items-center">
      <p className="font-heading font-bold text-brand-primary text-[16px] leading-snug mb-1.5">
        {phase.name}
      </p>
      <p className="font-body text-black/75 text-[12.5px] leading-snug mb-2">{phase.purpose}</p>
      {status ? (
        <span
          className={`font-body font-bold uppercase tracking-wide text-[10.5px] leading-none px-2.5 py-1 rounded-full ${STATUS_STYLES[status] ?? ""}`}
        >
          {status}
        </span>
      ) : null}
    </div>
  );
}

function DownChevron({ align }: { align: "end" | "start" }) {
  return (
    <div className={`flex ${align === "end" ? "justify-end pr-10" : "justify-start pl-10"}`}>
      <div className="w-11 h-11 rounded-full bg-brand-accent flex items-center justify-center shadow-[3px_3px_0_rgba(0,0,0,0.15)]">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#000"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}

export function Timeline() {
  const [status, setStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/timeline-status", { cache: "no-store" });
        if (!res.ok) throw new Error("bad response");
        const data = (await res.json()) as { status?: Record<string, string> };
        if (!cancelled && data.status) setStatus(data.status);
      } catch {
        if (!cancelled) setStatus(timelineFallback.status);
      }
    }
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <section
      id="timeline"
      aria-label="Timeline at a glance"
      className="w-full h-full flex flex-col justify-center bg-brand-offwhite"
    >
      <div className="px-20 py-10 flex flex-col gap-7 max-w-[1440px] mx-auto w-full">
        <div>
          <p className="font-heading font-extrabold uppercase tracking-[0.1em] text-brand-pink text-[15px] mb-2">
            The Roadmap
          </p>
          <h2 className="font-heading font-bold uppercase text-brand-primary text-[42px] leading-[1.05]">
            The Timeline at a Glance
          </h2>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex gap-2.5">
            {TIMELINE_ROW_ONE.map((phase) => (
              <DateChip key={phase.id} phase={phase} direction="right" tone="primary" />
            ))}
          </div>
          <div className="flex gap-2.5">
            {TIMELINE_ROW_ONE.map((phase) => (
              <PhaseCopy key={phase.id} phase={phase} status={status[phase.id]} />
            ))}
          </div>
        </div>
        <DownChevron align="end" />
        <div className="flex flex-col gap-3">
          <div className="flex flex-row-reverse gap-2.5">
            {TIMELINE_ROW_TWO.map((phase) => (
              <DateChip key={phase.id} phase={phase} direction="left" tone="pink" />
            ))}
          </div>
          <div className="flex flex-row-reverse gap-2.5">
            {TIMELINE_ROW_TWO.map((phase) => (
              <PhaseCopy key={phase.id} phase={phase} status={status[phase.id]} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
