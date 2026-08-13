import type { CSSProperties, ReactNode } from "react";
import { APPLY_URL } from "@/lib/constants";

type CtaButtonProps = {
  href?: string;
  label: string;
  className?: string;
  style?: CSSProperties;
  topStripe: string;
  bottomStripe: string;
  glow?: boolean;
  labelStyle?: CSSProperties;
  children?: ReactNode;
};

export function CtaButton({
  href = APPLY_URL,
  label,
  className = "",
  style,
  topStripe,
  bottomStripe,
  glow = false,
  labelStyle,
}: CtaButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={`${glow ? "cta-button-glow fast-cta" : ""} block overflow-hidden rounded-none border-0 bg-transparent p-0 hover:opacity-100 cursor-pointer ${className}`}
      tabIndex={0}
      style={style}
    >
      <p
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          color: "#0B6839",
          fontFamily: "var(--font-imbue)",
          fontWeight: 700,
          fontSize: 38,
          lineHeight: 1,
          textTransform: "uppercase",
          textAlign: "center",
          margin: 0,
          overflow: "visible",
          whiteSpace: "nowrap",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...labelStyle,
        }}
      >
        {label}
      </p>
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: 7,
          backgroundImage: `url(${topStripe})`,
          backgroundRepeat: "repeat-x",
          backgroundPosition: "left top",
          backgroundSize: "101px 7px",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: "100%",
          height: 7,
          backgroundImage: `url(${bottomStripe})`,
          backgroundRepeat: "repeat-x",
          backgroundPosition: "left top",
          backgroundSize: "101px 7px",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />
    </a>
  );
}
