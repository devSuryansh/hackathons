"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { CtaButton } from "@/components/ui/CtaButton";
import { Reveal } from "@/components/ui/Reveal";

function MuteIcon({ muted }: { muted: boolean }) {
  if (muted) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

export function Hero() {
  const reduced = useReducedMotion() ?? false;

  return (
    <>
      <Reveal variant="hero" delay={0}>
        <img
          src="/assets/Sun rise.png"
          alt=""
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 1440,
            height: 1438,
            display: "block",
            objectFit: "fill",
          }}
        />
      </Reveal>
      <Reveal variant="hero" delay={0.08}>
        <img
          src="/assets/2-47.svg"
          alt="Vector"
          style={{
            position: "absolute",
            left: 80,
            top: 50,
            width: 113,
            height: 99,
            background: "none",
            objectFit: "contain",
          }}
        />
      </Reveal>
      <Reveal
        variant="hero"
        delay={0.18}
        style={{
          position: "absolute",
          left: 1000,
          top: 90,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 24,
        }}
      >
        <Link
          href="/#check-hype"
          style={{
            color: "#FFFFFF",
            fontFamily: "var(--font-victor-mono)",
            fontWeight: 600,
            fontSize: 22,
            lineHeight: "0.84em",
            letterSpacing: 0,
            textTransform: "uppercase",
            textAlign: "center",
            margin: 0,
            zIndex: 10,
            textDecoration: "none",
            cursor: "pointer",
            whiteSpace: "pre-line",
          }}
        >
          CHECK HYPE
        </Link>
      </Reveal>
      <Reveal variant="hero" delay={0.5}>
        <CtaButton
          label="APPLY"
          glow
          topStripe="/assets/002-group-54-14.svg"
          bottomStripe="/assets/008-group-54-324.svg"
          style={{
            position: "absolute",
            left: 1163,
            top: 66,
            width: 197,
            height: 65.67,
            background: "#FEE101",
          }}
        />
      </Reveal>
      <Reveal variant="hero" delay={0.12}>
        <img
          src="/assets/Hacker house.png"
          alt="Hacker house"
          style={{
            position: "absolute",
            left: 139,
            top: 240,
            width: 1162,
            height: 251,
            display: "block",
            objectFit: "fill",
          }}
        />
      </Reveal>
      <motion.img
        src="/assets/goa_hindi.svg"
        alt="gaaevaa"
        style={{
          position: "absolute",
          left: 643.06,
          top: 280.43,
          width: 153.94,
          height: 151.77,
          background: "none",
          objectFit: "contain",
        }}
        animate={reduced ? undefined : { y: [-8, 8, -8], rotate: [-2, 2, -2] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <Reveal
        variant="hero"
        delay={0.28}
        style={{
          position: "absolute",
          left: 90,
          top: 513,
          width: 500,
          height: 18,
          color: "#FEE101",
          fontFamily: "var(--font-victor-mono)",
          fontWeight: 600,
          fontSize: 22,
          lineHeight: "0.84em",
          textTransform: "uppercase",
          textAlign: "center",
          margin: 0,
          zIndex: 10,
          whiteSpace: "pre-line",
        }}
      >
        GOA, INDIA{"\u00a0"} ·{"\u00a0"} 28 – 31 OCT 2026
      </Reveal>
      <Reveal
        variant="hero"
        delay={0.35}
        style={{
          position: "absolute",
          left: 1085,
          top: 513,
          width: 250,
          height: 18,
          color: "#FEE101",
          fontFamily: "var(--font-victor-mono)",
          fontWeight: 600,
          fontSize: 22,
          lineHeight: "0.84em",
          textTransform: "uppercase",
          textAlign: "center",
          margin: 0,
          zIndex: 10,
          whiteSpace: "pre-line",
        }}
      >
        2:47 pm Studio
      </Reveal>
    </>
  );
}

export function VideoBand() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {
      video.muted = true;
      setMuted(true);
      video.play().catch(() => undefined);
    });
  }, []);

  return (
    <Reveal
      variant="hero"
      delay={0.42}
      id="check-hype"
      style={{
        position: "absolute",
        left: 0,
        top: 1438,
        width: 1440,
        height: 739,
        background: "#000",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <video
        ref={videoRef}
        src="/Prehype.mp4"
        autoPlay
        loop
        playsInline
        preload="auto"
        muted={muted}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
      <button
        type="button"
        aria-label={muted ? "Unmute video" : "Mute video"}
        tabIndex={0}
        onClick={() => {
          const next = !muted;
          setMuted(next);
          if (videoRef.current) videoRef.current.muted = next;
        }}
        style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "1.5px solid #fee101",
          background: "rgba(11, 104, 57, 0.95)",
          backdropFilter: "blur(4px)",
          color: "#fee101",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          padding: 0,
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        }}
      >
        <MuteIcon muted={muted} />
      </button>
    </Reveal>
  );
}
