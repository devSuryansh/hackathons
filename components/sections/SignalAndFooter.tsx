"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { APPLY_URL, CONTACT_MAIL, EASE_OUT_SOFT } from "@/lib/constants";
import { CtaButton } from "@/components/ui/CtaButton";
import { Reveal } from "@/components/ui/Reveal";

const FOOTER_TEXT: React.CSSProperties = {
  color: "#FEE101",
  fontFamily: "var(--font-victor-mono)",
  fontWeight: 600,
  fontSize: 15.885855674743652,
  lineHeight: "0.84em",
  letterSpacing: 0,
  textTransform: "uppercase",
  margin: 0,
  overflow: "visible",
  whiteSpace: "pre-line",
  zIndex: 10,
};

export function SignalAndFooter() {
  const reduced = useReducedMotion() ?? false;

  return (
    <>
      <Reveal variant="scale-in">
        <img
          src="/assets/hackers.png"
          alt=""
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 10834,
            width: 1440,
            height: 804,
            display: "block",
            objectFit: "fill",
          }}
        />
      </Reveal>
      <Reveal
        style={{
          position: "absolute",
          left: 80,
          top: 10402,
          display: "flex",
          flexDirection: "row",
          gap: 84,
        }}
      >
        <p
          style={{
            width: 458,
            color: "#FFFFFF",
            fontFamily: "var(--font-imbue)",
            fontWeight: 500,
            fontSize: 64,
            lineHeight: "1.1em",
            letterSpacing: 0,
            textTransform: "capitalize",
            textAlign: "left",
            margin: 0,
            whiteSpace: "pre-line",
            zIndex: 10,
          }}
        >
          {"Less Noise.\nMore Signal"}
        </p>
        <motion.div
          style={{
            width: 738,
            display: "flex",
            flexDirection: "column",
            gap: 40,
            position: "relative",
          }}
          initial={reduced ? false : { opacity: 0, y: 18 }}
          whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.45, ease: EASE_OUT_SOFT }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
            <p
              style={{
                width: "100%",
                color: "#EDD723",
                fontFamily: "var(--font-victor-mono)",
                fontWeight: 700,
                fontSize: 18,
                lineHeight: "1.2em",
                textTransform: "capitalize",
                textAlign: "left",
                margin: 0,
                whiteSpace: "pre-line",
              }}
            >
              Most hackathons are just hype and no substance. We&apos;re changing that. From October
              28–31, we&apos;re taking over Goa for the country&apos;s biggest build-station.
            </p>
            <p
              style={{
                width: "100%",
                color: "#EDD723",
                fontFamily: "var(--font-victor-mono)",
                fontWeight: 700,
                fontSize: 18,
                lineHeight: "1.2em",
                textTransform: "capitalize",
                textAlign: "left",
                margin: 0,
                whiteSpace: "pre-line",
              }}
            >
              This is for the developers who live in their terminals and ship things that matter. No
              fluff, no useless networking—just 500 elite builders, high-speed fiber, and the ocean at
              your doorstep. If you&apos;re ready to lock in and build your legacy, we&apos;ll see you
              on the sand.
            </p>
          </div>
          <CtaButton
            href={APPLY_URL}
            label="Go to Devfolio"
            topStripe="/assets/149-group-54-27351.svg"
            bottomStripe="/assets/155-group-54-27661.svg"
            style={{ width: 197, height: 65.67, background: "#FEE101", position: "relative" }}
            labelStyle={{
              left: 20,
              top: 17,
              width: 158,
              height: 32,
              fontSize: 32,
              display: "block",
              textAlign: "left",
              justifyContent: "flex-start",
              alignItems: "flex-start",
            }}
          />
        </motion.div>
      </Reveal>
      <Reveal variant="scale-in">
        <img
          src="/assets/footer trees.png"
          alt=""
          aria-hidden
          style={{
            position: "absolute",
            left: -22,
            top: 11638,
            width: 1485,
            height: 941,
            display: "block",
            objectFit: "fill",
          }}
        />
      </Reveal>
      <Reveal>
        <img
          src="/assets/179-vector-54-30944.svg"
          alt="Vector"
          style={{
            position: "absolute",
            left: 575,
            top: 11819,
            width: 291,
            height: 255,
            background: "none",
            objectFit: "contain",
          }}
        />
      </Reveal>
      <Reveal
        style={{
          ...FOOTER_TEXT,
          position: "absolute",
          left: 470,
          top: 12096,
          width: 500,
          height: 13,
          textAlign: "center",
        }}
      >
        GOA, INDIA{"\u00a0"} ·{"\u00a0"} 28 – 31 OCT 2026
      </Reveal>
      <Reveal
        style={{
          ...FOOTER_TEXT,
          position: "absolute",
          left: 470,
          top: 12123,
          width: 500,
          height: 13,
          textAlign: "center",
        }}
      >
        2:47 pm Studio
      </Reveal>
      <Reveal
        style={{
          ...FOOTER_TEXT,
          position: "absolute",
          left: 799,
          top: 12318,
          width: 400,
          height: 13,
          textAlign: "left",
        }}
      >
        © 2026 HH-Goa. All rights reserved.
      </Reveal>
      <Reveal
        style={{
          ...FOOTER_TEXT,
          position: "absolute",
          left: 799,
          top: 12227,
          width: 200,
          height: 13,
          color: "#FFFFFF",
          textAlign: "left",
        }}
      >
        Brand Kit
      </Reveal>
      <Reveal>
        <Link
          href="/terms"
          style={{
            ...FOOTER_TEXT,
            position: "absolute",
            left: 799,
            top: 12252,
            width: 200,
            height: 13,
            color: "#FFFFFF",
            textAlign: "left",
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          Term & Conditions
        </Link>
      </Reveal>
      <Reveal
        style={{
          position: "absolute",
          left: 405,
          top: 12214,
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: 5.7147016525268555,
        }}
      >
        <SocialRow
          icon="/assets/180-frame-1948754793-54-30952.svg"
          iconH={24.63}
          href="https://x.com/247pmstudio"
          label="@247pmstudio"
          reduced={reduced}
        />
        <SocialRow
          icon="/assets/181-frame-1948754789-54-30958.svg"
          iconH={22.86}
          href="https://t.me/twofourtysevenpm"
          label="@twofourtysevenpm"
          reduced={reduced}
        />
        <SocialRow
          icon="/assets/182-frame-1948754788-54-30962.svg"
          iconH={22.11}
          href={CONTACT_MAIL}
          label="satapathyprayasu@gmail.com"
          reduced={reduced}
        />
      </Reveal>
    </>
  );
}

function SocialRow({
  icon,
  iconH,
  href,
  label,
  reduced,
}: {
  icon: string;
  iconH: number;
  href: string;
  label: string;
  reduced: boolean;
}) {
  return (
    <motion.div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 14.946142196655273,
        padding: "6.593886375427246px 0px",
        width: "100%",
        position: "relative",
      }}
      initial={reduced ? false : { opacity: 0, y: 18 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, ease: EASE_OUT_SOFT }}
    >
      <img src={icon} alt="" style={{ width: 27.25, height: iconH, objectFit: "contain" }} />
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: "#FFFFFF",
          fontFamily: "var(--font-victor-mono)",
          fontWeight: 700,
          fontSize: 17.583696365356445,
          lineHeight: "1.35em",
          textTransform: "uppercase",
          textAlign: "left",
          margin: 0,
          textDecoration: "none",
          cursor: "pointer",
          whiteSpace: "pre-line",
        }}
      >
        {label}
      </a>
    </motion.div>
  );
}
