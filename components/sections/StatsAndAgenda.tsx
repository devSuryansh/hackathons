"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { CSSProperties } from "react";
import { CountUp } from "@/components/ui/CountUp";
import { Reveal } from "@/components/ui/Reveal";
import { EASE_OUT_SMOOTH, EASE_OUT_SOFT } from "@/lib/constants";

const STAT_NUMBER: CSSProperties = {
  fontFamily: "var(--font-imbue)",
  fontWeight: 700,
  fontSize: 67.12921142578125,
  lineHeight: "0.77em",
  letterSpacing: 0,
  textTransform: "uppercase",
  textAlign: "left",
  margin: 0,
  overflow: "visible",
  whiteSpace: "pre-line",
  zIndex: 10,
  WebkitFontSmoothing: "antialiased",
};

const STAT_LABEL: CSSProperties = {
  fontFamily: "var(--font-victor-mono)",
  fontWeight: 700,
  textTransform: "uppercase",
  textAlign: "left",
  margin: 0,
  overflow: "visible",
  whiteSpace: "pre-line",
  zIndex: 10,
  WebkitFontSmoothing: "antialiased",
};

export function StatsAndAgenda({ viewportWidth }: { viewportWidth: number }) {
  const reduced = useReducedMotion() ?? false;
  const narrow = viewportWidth < 1280;
  const compact = viewportWidth < 920;
  const roomWidth = compact ? 980 : narrow ? 1020 : 1060;
  const roomTop = (compact ? 3281 : 3277) + 3250;
  const dayFont = (id: "d1" | "d2" | "d3" | "d4") => {
    if (id === "d4") return compact ? 18 : 20;
    if (id === "d2") return compact ? 17 : 19;
    return compact ? 20 : 22;
  };
  const dayWidth = (id: "d1" | "d2" | "d3" | "d4") => {
    if (id === "d4") return compact ? 292 : 304;
    if (id === "d2") return compact ? 286 : 300;
    return compact ? 258 : 274;
  };

  return (
    <>
      <Reveal
        style={{
          position: "absolute",
          left: 40,
          top: 5470,
          width: 1400,
          height: 80,
          color: "#FFFFFF",
          fontFamily: "var(--font-imbue)",
          fontWeight: 500,
          fontSize: 132.8,
          lineHeight: "1.1em",
          textTransform: "capitalize",
          textAlign: "center",
          margin: 0,
          zIndex: 10,
          whiteSpace: "pre-line",
        }}
      >
        Inside HHG: Past Editions
      </Reveal>
      <Reveal>
        <img
          src="/assets/details.png"
          alt=""
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 5426,
            width: 1440,
            height: 937,
            display: "block",
            objectFit: "fill",
          }}
        />
      </Reveal>
      <CountUp
        text="6800+"
        style={{
          ...STAT_NUMBER,
          position: "absolute",
          left: 545,
          top: 5660,
          width: 138,
          height: 52,
          color: "#0B6839",
        }}
      />
      <CountUp
        text="100"
        style={{
          ...STAT_NUMBER,
          position: "absolute",
          left: 599,
          top: 5874,
          width: 78,
          height: 52,
          color: "#0B6839",
        }}
      />
      <CountUp
        text="390+"
        style={{
          ...STAT_NUMBER,
          position: "absolute",
          left: 663,
          top: 5765,
          width: 107,
          height: 52,
          color: "#F9DC01",
        }}
      />
      <CountUp
        text="$50k+"
        style={{
          ...STAT_NUMBER,
          position: "absolute",
          left: 657,
          top: 5982,
          width: 126,
          height: 52,
          color: "#F9DC01",
        }}
      />
      <Reveal
        delay={0.25}
        style={{
          ...STAT_LABEL,
          position: "absolute",
          left: 693,
          top: 5664,
          width: 145,
          height: 44,
          color: "#0B6839",
          fontSize: 18,
          lineHeight: "1.2em",
        }}
      >
        Registrations 2024
      </Reveal>
      <Reveal
        delay={0.25}
        style={{
          ...STAT_LABEL,
          position: "absolute",
          left: 687,
          top: 5889,
          width: 83,
          height: 22,
          color: "#0B6839",
          fontSize: 18,
          lineHeight: "1.2em",
        }}
      >
        Projects
      </Reveal>
      <Reveal
        delay={0.25}
        style={{
          ...STAT_LABEL,
          position: "absolute",
          left: 780,
          top: 5778,
          width: 89,
          height: 26,
          color: "#F9DC01",
          fontSize: 22,
          lineHeight: "1.2em",
        }}
      >
        Hackers
      </Reveal>
      <Reveal
        delay={0.25}
        style={{
          ...STAT_LABEL,
          position: "absolute",
          left: 789,
          top: 5982,
          width: 101,
          height: 52,
          color: "#F9DC01",
          fontSize: 22,
          lineHeight: "1.2em",
        }}
      >
        {"Bounties\n2026"}
      </Reveal>
      <Reveal>
        <img
          src="/assets/agenda.png"
          alt=""
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 6957,
            width: 1440,
            height: 872,
            display: "block",
            objectFit: "fill",
          }}
        />
      </Reveal>
      <Reveal>
        <img
          src="/assets/019-group-59467-54-3485.svg"
          alt="Group 59467"
          style={{
            position: "absolute",
            left: 0,
            top: 6363,
            width: 1440,
            height: 74,
            objectFit: "cover",
            objectPosition: "center",
            maxWidth: "none",
          }}
        />
      </Reveal>
      <motion.div
        style={{
          position: "absolute",
          left: `calc(50% - ${roomWidth / 2}px)`,
          top: roomTop,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 40,
          width: roomWidth,
        }}
        initial={reduced ? false : { opacity: 0, y: 44, scale: 0.96 }}
        whileInView={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.75, ease: EASE_OUT_SOFT }}
      >
        <motion.p
          style={{
            color: "#FFFFFF",
            fontFamily: "var(--font-victor-mono)",
            fontWeight: 600,
            fontSize: 33.38,
            lineHeight: "0.84em",
            letterSpacing: "0.5em",
            textTransform: "uppercase",
            textAlign: "center",
            margin: 0,
            width: "100%",
          }}
          initial={reduced ? false : { opacity: 0, letterSpacing: "0.5em", filter: "blur(8px)", y: 20 }}
          whileInView={reduced ? undefined : { opacity: 1, letterSpacing: "0em", filter: "blur(0px)", y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1.2, ease: EASE_OUT_SMOOTH }}
        >
          Inside the room
        </motion.p>
        <motion.p
          style={{
            width: roomWidth,
            color: "#FFFFFF",
            fontFamily: "var(--font-imbue)",
            fontWeight: 500,
            fontSize: 132.8,
            lineHeight: compact ? 1.05 : 1.1,
            letterSpacing: compact ? "-0.015em" : "-0.02em",
            textTransform: "capitalize",
            textAlign: "center",
            margin: 0,
            maxWidth: 1060,
            marginInline: "auto",
            whiteSpace: "pre-line",
          }}
          initial={reduced ? false : { opacity: 0, y: 60, scale: 0.88, filter: "blur(4px)" }}
          whileInView={reduced ? undefined : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1, delay: 0.35, ease: EASE_OUT_SMOOTH }}
        >
          4 days. one rhythm. everything intentional.
        </motion.p>
      </motion.div>
      <DayCard
        left={92}
        top={7142}
        title="day 01 - genesis day"
        subtitle="where it all begins"
        color="#0B6839"
        titleWidth={dayWidth("d1")}
        titleSize={dayFont("d1")}
        reduced={reduced}
      />
      <DayCard
        left={1078}
        top={7450}
        title="day 04 - Launch day"
        subtitle="the world watches"
        color="#0B6839"
        titleWidth={dayWidth("d4")}
        titleSize={dayFont("d4")}
        reduced={reduced}
      />
      <DayCard
        left={1078}
        top={7142}
        title="day 03 - build day"
        subtitle="heads down. ship or ship"
        color="#FFFFFF"
        titleWidth={dayWidth("d3")}
        titleSize={dayFont("d3")}
        reduced={reduced}
      />
      <DayCard
        left={92}
        top={7443}
        title="day 02 - day of triangle"
        subtitle="problem. solution. market"
        color="#FFFFFF"
        titleWidth={dayWidth("d2")}
        titleSize={dayFont("d2")}
        reduced={reduced}
      />
      <Reveal>
        <img
          src="/assets/036-vector-54-3934.svg"
          alt="Vector"
          style={{
            position: "absolute",
            left: 642,
            top: 7561,
            width: 155,
            height: 135,
            background: "transparent",
            objectFit: "contain",
          }}
        />
      </Reveal>
    </>
  );
}

function DayCard({
  left,
  top,
  title,
  subtitle,
  color,
  titleWidth,
  titleSize,
  reduced,
}: {
  left: number;
  top: number;
  title: string;
  subtitle: string;
  color: string;
  titleWidth: number;
  titleSize: number;
  reduced: boolean;
}) {
  return (
    <motion.div
      style={{
        position: "absolute",
        left,
        top,
        width: 280,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
      initial={reduced ? false : { opacity: 0, x: 50 }}
      whileInView={reduced ? undefined : { opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.65, ease: EASE_OUT_SOFT }}
    >
      <p
        style={{
          position: "relative",
          width: titleWidth,
          color,
          fontFamily: "var(--font-victor-mono)",
          fontWeight: 600,
          fontSize: titleSize,
          lineHeight: "0.88em",
          letterSpacing: "-0.015em",
          textTransform: "uppercase",
          textAlign: "center",
          margin: 0,
          whiteSpace: "nowrap",
          zIndex: 10,
        }}
      >
        {title}
      </p>
      <motion.p
        style={{
          color,
          fontFamily: "var(--font-victor-mono)",
          fontWeight: 700,
          fontSize: 18,
          lineHeight: "1.3em",
          letterSpacing: "-0.01em",
          textTransform: "uppercase",
          textAlign: "center",
          position: "relative",
          margin: 0,
          marginTop: 48,
          whiteSpace: "nowrap",
          width: "100%",
        }}
        initial={reduced ? false : { opacity: 0, y: 8 }}
        whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.45, ease: EASE_OUT_SOFT }}
      >
        {subtitle}
      </motion.p>
    </motion.div>
  );
}
