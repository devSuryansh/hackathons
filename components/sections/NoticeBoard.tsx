"use client";

import { useEffect, useState } from "react";
import { NOTICE_PINS, NOTICE_ROTATIONS } from "@/lib/constants";
import { formatNoticeDate, noticeFontSize } from "@/lib/format";
import type { Notice } from "@/lib/types";
import noticesFallback from "@/lib/data/notices.json";

function NoticeCard({ notice, index }: { notice: Notice; index: number }) {
  const rotation = NOTICE_ROTATIONS[index % NOTICE_ROTATIONS.length];
  const pin = NOTICE_PINS[index % NOTICE_PINS.length];
  const isHttp = notice.linkUrl?.startsWith("http");

  return (
    <div
      className="relative bg-brand-offwhite rounded-sm px-6 py-7 w-[250px] shrink-0 shadow-[6px_8px_0_rgba(0,0,0,0.25)]"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <span
        aria-hidden
        className={`absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full ${pin} border-2 border-brand-offwhite shadow-[0_2px_3px_rgba(0,0,0,0.35)]`}
      />
      <p
        className={`font-body text-black/85 text-center ${noticeFontSize(notice.text)}`}
        style={{ whiteSpace: "pre-line" }}
      >
        {notice.text}
      </p>
      {notice.linkLabel && notice.linkUrl ? (
        <div className="mt-4 text-center">
          <a
            href={notice.linkUrl}
            target={isHttp ? "_blank" : undefined}
            rel={isHttp ? "noopener noreferrer" : undefined}
            className="inline-block font-heading font-bold uppercase text-[11px] tracking-wide text-white bg-brand-pink px-3.5 py-1.5 rounded-full hover:opacity-90 transition-opacity"
          >
            {notice.linkLabel}
          </a>
        </div>
      ) : null}
      <p className="mt-3 font-body text-black/40 text-[10px] uppercase tracking-wide text-center">
        {formatNoticeDate(notice.createdAt)}
      </p>
    </div>
  );
}

export function NoticeBoard() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/notice-board", { cache: "no-store" });
        if (!res.ok) throw new Error("bad response");
        const data = (await res.json()) as { notices?: Notice[] };
        if (!cancelled && data.notices) {
          setNotices(data.notices);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setNotices(noticesFallback.notices);
          setLoaded(true);
        }
      }
    }
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const hasNotices = loaded && notices.length > 0;

  return (
    <section
      id="notice-board"
      aria-label="Notice board"
      className="w-full h-full flex flex-col items-center justify-center bg-brand-primary px-6"
    >
      <div className="flex flex-col items-center gap-8 max-w-[1440px] w-full">
        <div className="text-center">
          <p className="font-heading font-extrabold uppercase tracking-[0.1em] text-brand-accent text-[15px] mb-2">
            Pinned Up
          </p>
          <h2 className="font-heading font-bold uppercase text-brand-white text-[42px] leading-[1.05]">
            Notice Board
          </h2>
        </div>
        {hasNotices ? (
          <div className="w-full max-h-[560px] overflow-y-auto px-4 py-2">
            <div className="flex flex-wrap items-start justify-center gap-x-8 gap-y-10">
              {notices.map((notice, index) => (
                <NoticeCard key={notice.id} notice={notice} index={index} />
              ))}
            </div>
          </div>
        ) : (
          <div className="w-[380px] h-[220px] rounded-md border-2 border-dashed border-brand-offwhite/25 flex items-center justify-center">
            <p className="font-body text-brand-offwhite/50 text-[13px] uppercase tracking-wide text-center px-6">
              Nothing pinned yet
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
