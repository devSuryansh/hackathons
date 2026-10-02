"use client";

import { useRef } from "react";

const ACCEPT = "image/jpeg,image/png,image/heic,image/heif,.heic,.heif,.jpg,.jpeg,.png";

type Props = {
  label: string;
  preview?: HTMLImageElement | null;
  onFile: (file: File) => void;
};

export function PhotoDropzone({ label, preview, onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function take(files: FileList | null) {
    const file = files?.[0];
    if (file) onFile(file);
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        take(event.dataTransfer.files);
      }}
      className="relative flex aspect-square w-full items-center justify-center overflow-hidden text-left"
      style={{ border: "2px solid #FEE101", backgroundColor: "#0B6839" }}
    >
      {preview ? (
        <img src={preview.src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span
          className="px-3 text-center uppercase"
          style={{
            color: "#FEE101",
            fontFamily: "var(--font-imbue)",
            fontWeight: 700,
            fontSize: 28,
            lineHeight: 1,
          }}
        >
          {label}
          <span
            className="mt-3 block"
            style={{
              fontFamily: "var(--font-victor-mono)",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.08em",
              color: "#FFFBE8",
            }}
          >
            JPG, PNG, or HEIC
          </span>
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => {
          take(event.target.files);
          event.target.value = "";
        }}
      />
    </button>
  );
}
