"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { EASE_OUT_SOFT, FAQS } from "@/lib/constants";
import { Reveal } from "@/components/ui/Reveal";

export function Faq() {
  const [openId, setOpenId] = useState<string | null>(null);
  const reduced = useReducedMotion() ?? false;

  return (
    <>
      <Reveal
        style={{
          position: "absolute",
          left: 79,
          top: 9189,
          width: 1282,
          height: 146,
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
        FAQs
      </Reveal>
      <Reveal
        style={{
          position: "absolute",
          left: 80,
          top: 9385,
          width: 1281.24,
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: 34,
        }}
      >
        {FAQS.map((faq, index) => {
          const open = openId === faq.id;
          return (
            <motion.div
              key={faq.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                gap: index === 0 ? 40 : 30,
                width: "100%",
                position: "relative",
              }}
              initial={reduced ? false : { opacity: 0, y: 32, scale: 0.97 }}
              whileInView={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.6, delay: index * 0.1, ease: EASE_OUT_SOFT }}
            >
              <div style={{ display: "block", width: "100%", position: "relative" }}>
                {index === 0 ? (
                  <img
                    src="/assets/138-frame-1948755142-54-27257.svg"
                    alt=""
                    aria-hidden
                    style={{ display: "block", width: "100%", height: "auto", marginBottom: 16 }}
                  />
                ) : null}
                <motion.button
                  type="button"
                  className="w-full appearance-none border-0 bg-transparent p-0 text-left cursor-pointer"
                  aria-label={faq.question}
                  aria-controls={`faq-panel-${faq.id}`}
                  aria-expanded={open}
                  onClick={() => setOpenId((current) => (current === faq.id ? null : faq.id))}
                  whileHover="hover"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  <motion.p
                    variants={{ hover: { color: "#fee101", x: 4 } }}
                    transition={{ duration: 0.2, ease: EASE_OUT_SOFT }}
                    style={{
                      fontFamily: "var(--font-imbue)",
                      fontWeight: 500,
                      fontSize: 34,
                      lineHeight: "1.2em",
                      textTransform: "capitalize",
                      textAlign: "left",
                      color: "#FFFFFF",
                      margin: 0,
                      flex: 1,
                    }}
                  >
                    {faq.question}
                  </motion.p>
                  <motion.span
                    aria-hidden
                    variants={{ hover: { scale: 1.1, borderColor: "#fee101", color: "#fee101" } }}
                    animate={{ rotate: open ? 45 : 0 }}
                    transition={{ duration: 0.25, ease: EASE_OUT_SOFT }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-2xl leading-none text-white"
                  >
                    +
                  </motion.span>
                </motion.button>
                <motion.p
                  id={`faq-panel-${faq.id}`}
                  role="region"
                  aria-label={faq.question}
                  initial={false}
                  animate={{
                    height: open ? "auto" : 0,
                    opacity: open ? 1 : 0,
                    y: open ? 0 : -4,
                  }}
                  transition={{ duration: reduced ? 0 : 0.28, ease: "easeOut" }}
                  style={{
                    fontFamily: "var(--font-victor-mono)",
                    fontWeight: 700,
                    fontSize: 22,
                    lineHeight: "1.2em",
                    textTransform: "capitalize",
                    textAlign: "left",
                    color: "#EDD723",
                    margin: 0,
                    marginTop: 14,
                    overflow: "hidden",
                    pointerEvents: open ? "auto" : "none",
                    whiteSpace: "pre-line",
                  }}
                >
                  {faq.answer}
                </motion.p>
                <img
                  src="/assets/140-frame-1948755145-54-27273.svg"
                  alt=""
                  aria-hidden
                  style={{ display: "block", width: "100%", height: "auto", marginTop: 16 }}
                />
              </div>
            </motion.div>
          );
        })}
      </Reveal>
    </>
  );
}
