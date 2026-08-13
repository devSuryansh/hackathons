"use client";

import type { ButtonHTMLAttributes } from "react";

const TOP = "/assets/002-group-54-14.svg";
const BOTTOM = "/assets/008-group-54-324.svg";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

export function StripeButton({ label, className = "", disabled, ...props }: Props) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled}
      aria-label={label}
      className={`cta-button-glow fast-cta relative block w-full overflow-hidden rounded-none border-0 p-0 disabled:cursor-not-allowed ${className}`}
      style={{
        height: 65.67,
        background: "#FEE101",
        opacity: disabled ? 0.85 : 1,
      }}
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
          lineHeight: "1em",
          textTransform: "uppercase",
          textAlign: "center",
          margin: 0,
          overflow: "visible",
          whiteSpace: "nowrap",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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
          backgroundImage: `url(${TOP})`,
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
          backgroundImage: `url(${BOTTOM})`,
          backgroundRepeat: "repeat-x",
          backgroundPosition: "left top",
          backgroundSize: "101px 7px",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />
    </button>
  );
}
