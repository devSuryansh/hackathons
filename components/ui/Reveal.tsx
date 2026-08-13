"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";
import { EASE_OUT_SOFT } from "@/lib/constants";

type RevealVariant = "fade-up" | "hero" | "scale-in" | "slide-x" | "blur-title";

type RevealProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  delay?: number;
  variant?: RevealVariant;
  id?: string;
};

export function Reveal({
  children,
  className,
  style,
  delay = 0,
  variant = "fade-up",
  id,
}: RevealProps) {
  const reduced = useReducedMotion() ?? false;

  if (reduced) {
    return (
      <div id={id} className={className} style={style}>
        {children}
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <motion.div
        id={id}
        className={className}
        style={style}
        initial={{ opacity: 0, y: 32, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 18, delay }}
      >
        {children}
      </motion.div>
    );
  }

  const motionProps =
    variant === "scale-in"
      ? {
          initial: { opacity: 0, scale: 0.94 },
          whileInView: { opacity: 1, scale: 1 },
          transition: { duration: 0.9, ease: EASE_OUT_SOFT, delay },
        }
      : variant === "slide-x"
        ? {
            initial: { opacity: 0, x: 50 },
            whileInView: { opacity: 1, x: 0 },
            transition: { duration: 0.65, ease: EASE_OUT_SOFT, delay },
          }
        : variant === "blur-title"
          ? {
              initial: { opacity: 0, letterSpacing: "0.5em", filter: "blur(8px)", y: 20 },
              whileInView: { opacity: 1, letterSpacing: "0em", filter: "blur(0px)", y: 0 },
              transition: { duration: 1.2, ease: EASE_OUT_SOFT, delay },
            }
          : {
              initial: { opacity: 0, y: 28 },
              whileInView: { opacity: 1, y: 0 },
              transition: { duration: 0.55, ease: EASE_OUT_SOFT, delay },
            };

  return (
    <motion.div
      id={id}
      className={className}
      style={style}
      initial={motionProps.initial}
      whileInView={motionProps.whileInView}
      viewport={{ once: true, amount: 0.12 }}
      transition={motionProps.transition}
    >
      {children}
    </motion.div>
  );
}
