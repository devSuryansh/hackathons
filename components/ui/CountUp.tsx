"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { EASE_OUT_SMOOTH } from "@/lib/constants";

type CountUpProps = {
  text: string;
  style: CSSProperties;
};

export function CountUp({ text, style }: CountUpProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduced = useReducedMotion() ?? false;
  const match = text.match(/^([^0-9]*)(\d+)(.*)$/);
  const prefix = match?.[1] ?? "";
  const target = parseInt(match?.[2] ?? "0", 10);
  const suffix = match?.[3] ?? "";
  const [value, setValue] = useState(() => (reduced ? text : `${prefix}0${suffix}`));

  useEffect(() => {
    if (!inView || reduced) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / 1600, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(`${prefix}${Math.round(target * eased)}${suffix}`);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, reduced, prefix, suffix, target]);

  return (
    <motion.p
      ref={ref}
      style={style}
      initial={reduced ? false : { opacity: 0, scale: 0.5, y: 40 }}
      whileInView={reduced ? undefined : { opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: 0.8,
        ease: EASE_OUT_SMOOTH,
        scale: { type: "spring", stiffness: 180, damping: 14 },
      }}
    >
      {value}
    </motion.p>
  );
}
