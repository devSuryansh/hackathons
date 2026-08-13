"use client";

import { useEffect, useState } from "react";
import { FIGMA_HEIGHT, FIGMA_WIDTH } from "@/lib/constants";
import { Faq } from "@/components/sections/Faq";
import { Hero, VideoBand } from "@/components/sections/Hero";
import { LeaderboardPreview } from "@/components/sections/LeaderboardPreview";
import { NoticeBoard } from "@/components/sections/NoticeBoard";
import { SignalAndFooter } from "@/components/sections/SignalAndFooter";
import { StatsAndAgenda } from "@/components/sections/StatsAndAgenda";
import { Tasks } from "@/components/sections/Tasks";
import { Timeline } from "@/components/sections/Timeline";

export function HomeCanvas() {
  const [width, setWidth] = useState(1440);

  useEffect(() => {
    const update = () => setWidth(document.documentElement.clientWidth);
    update();
    window.addEventListener("resize", update);

    const clearSelection = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "A" ||
        tag === "BUTTON" ||
        target.closest("a") ||
        target.closest("button") ||
        target.closest("input") ||
        target.closest("textarea") ||
        (tag === "SPAN" && target.style.userSelect !== "none") ||
        (tag === "P" && target.style.userSelect !== "none")
      ) {
        return;
      }
      const selection = window.getSelection();
      if (selection && selection.toString()) selection.removeAllRanges();
    };

    document.addEventListener("click", clearSelection);
    return () => {
      window.removeEventListener("resize", update);
      document.removeEventListener("click", clearSelection);
    };
  }, []);

  const scale = width / FIGMA_WIDTH;

  return (
    <section
      className="relative w-full overflow-hidden bg-brand-primary"
      style={{ height: FIGMA_HEIGHT * scale, minHeight: FIGMA_HEIGHT * scale }}
    >
      <main
        aria-label="HH Goa home page"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          overflow: "visible",
          width: FIGMA_WIDTH,
          height: FIGMA_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          background: "#0B6839",
        }}
      >
        <Hero />
        <VideoBand />
        <div
          style={{
            position: "absolute",
            top: 2176,
            left: 0,
            width: "100%",
            height: 950,
          }}
        >
          <NoticeBoard />
        </div>
        <div
          style={{
            position: "absolute",
            top: 3126,
            left: 0,
            width: "100%",
            height: 1450,
          }}
        >
          <Tasks />
        </div>
        <div
          style={{
            position: "absolute",
            top: 4576,
            left: 0,
            width: "100%",
            height: 850,
          }}
        >
          <LeaderboardPreview />
        </div>
        <StatsAndAgenda viewportWidth={width} />
        <div
          style={{
            position: "absolute",
            top: 7989,
            left: 0,
            width: "100%",
            height: 1200,
          }}
        >
          <Timeline />
        </div>
        <Faq />
        <SignalAndFooter />
      </main>
    </section>
  );
}
