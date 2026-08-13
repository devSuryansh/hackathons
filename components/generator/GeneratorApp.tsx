"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { builderClass } from "@/lib/builder-class";
import { fileToImage } from "@/lib/load-photo";
import { canvasSize, renderCard, type Format } from "@/lib/render-card";
import { HASHTAG, SITE_URL, shareCaption, tweetIntent } from "@/lib/share";
import { PhotoDropzone } from "./PhotoDropzone";
import { StripeButton } from "./StripeButton";

const FORMATS: { id: Format; label: string; hint: string }[] = [
  { id: "pfp", label: "PFP", hint: "X profile frame" },
  { id: "id", label: "ID card", hint: "Name, stack, class" },
  { id: "team", label: "Team", hint: "1 to 3 photos" },
];

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not export image"));
      },
      type,
      quality,
    );
  });
}

export function GeneratorApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [format, setFormat] = useState<Format>("pfp");
  const [photos, setPhotos] = useState<(HTMLImageElement | null)[]>([null, null, null]);
  const [name, setName] = useState("");
  const [stack, setStack] = useState("");
  const [teamName, setTeamName] = useState("");
  const [classSalt, setClassSalt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const [copied, setCopied] = useState(false);

  const klass = useMemo(
    () => builderClass(format === "team" ? teamName || name : name, stack, classSalt),
    [format, name, teamName, stack, classSalt],
  );

  const filledPhotos = photos.filter((photo): photo is HTMLImageElement => photo !== null);
  const ready = filledPhotos.length > 0;
  const size = canvasSize(format);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const shots = photos.filter((photo): photo is HTMLImageElement => photo !== null);
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void renderCard(canvas, {
        format,
        photos: shots,
        name,
        stack,
        teamName,
        classSalt,
      }).catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not draw the frame");
      });
    }, 40);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [format, photos, name, stack, teamName, classSalt]);

  const onFile = useCallback(async (index: number, file: File) => {
    setError(null);
    try {
      const image = await fileToImage(file);
      setPhotos((current) => {
        const next = [...current];
        next[index] = image;
        return next;
      });
    } catch {
      setError("Could not read that photo. Try JPG or PNG, or another HEIC export.");
    }
  }, []);

  const caption = shareCaption(format, SITE_URL);

  async function download() {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    setBusy("download");
    try {
      const blob = await canvasToBlob(canvas, "image/png");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `hhgoa-26-${format}.png`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Download failed. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function shareToX() {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    setBusy("share");
    setError(null);
    try {
      const png = await canvasToBlob(canvas, "image/png");
      const jpeg = await canvasToBlob(canvas, "image/jpeg", 0.92);
      const form = new FormData();
      form.append("image", jpeg, "card.jpg");
      const res = await fetch("/api/cards", { method: "POST", body: form });
      if (!res.ok) throw new Error("upload");
      const body: unknown = await res.json();
      const id =
        typeof body === "object" && body !== null && "id" in body && typeof body.id === "string"
          ? body.id
          : null;
      if (!id) throw new Error("upload");
      const shareUrl = `${SITE_URL}/c/${id}`;
      const text = shareCaption(format, SITE_URL, shareUrl);

      const file = new File([png], `hhgoa-26-${format}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
        return;
      }
      window.open(tweetIntent(text), "_blank", "noopener,noreferrer");
    } catch {
      setError("Share failed. Download the PNG and attach it to a post with #FrameInGoa.");
    } finally {
      setBusy(null);
    }
  }

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Could not copy. Select the caption below instead.");
    }
  }

  return (
    <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-8 px-4 pb-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start">
      <section className="space-y-6" style={{ background: "#0B6839" }}>
        <ol className="grid grid-cols-3 gap-2">
          {["1. Upload", "2. Pick format", "3. Download / share"].map((step) => (
            <li
              key={step}
              className="px-2 py-3"
              style={{
                background: "#FEE101",
                color: "#0B6839",
                fontFamily: "var(--font-imbue)",
                fontWeight: 700,
                fontSize: 22,
                lineHeight: 1.05,
                textTransform: "uppercase",
                textAlign: "center",
              }}
            >
              {step}
            </li>
          ))}
        </ol>

        <div className="grid grid-cols-3 gap-2">
          {FORMATS.map((item) => {
            const on = format === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFormat(item.id)}
                className="px-2 py-3 text-left"
                style={{
                  background: on ? "#FEE101" : "#0B6839",
                  border: "2px solid #FEE101",
                  color: on ? "#0B6839" : "#FEE101",
                }}
              >
                <span
                  className="block uppercase"
                  style={{
                    fontFamily: "var(--font-imbue)",
                    fontWeight: 700,
                    fontSize: 32,
                    lineHeight: 1,
                  }}
                >
                  {item.label}
                </span>
                <span
                  className="mt-2 block uppercase"
                  style={{
                    fontFamily: "var(--font-victor-mono)",
                    fontWeight: 700,
                    fontSize: 12,
                    letterSpacing: "0.06em",
                    color: on ? "#0B6839" : "#FEE101",
                  }}
                >
                  {item.hint}
                </span>
              </button>
            );
          })}
        </div>

        {format === "team" ? (
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((index) => (
              <PhotoDropzone
                key={index}
                label={`Photo ${index + 1}`}
                preview={photos[index]}
                onFile={(file) => void onFile(index, file)}
              />
            ))}
          </div>
        ) : (
          <PhotoDropzone
            label="Drop a photo"
            preview={photos[0]}
            onFile={(file) => void onFile(0, file)}
          />
        )}

        {(format === "id" || format === "team") && (
          <div className="space-y-3">
            {format === "team" ? (
              <label
                className="block uppercase"
                style={{ color: "#FEE101", fontWeight: 700, fontSize: 13, letterSpacing: "0.08em" }}
              >
                Team name
                <input
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  placeholder="cmd shift elite"
                  className="mt-1 w-full px-3 py-2 text-base normal-case tracking-normal text-white outline-none placeholder:text-white/50"
                  style={{ border: "2px solid #FEE101", backgroundColor: "#0B6839" }}
                />
              </label>
            ) : (
              <label
                className="block uppercase"
                style={{ color: "#FEE101", fontWeight: 700, fontSize: 13, letterSpacing: "0.08em" }}
              >
                Name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  className="mt-1 w-full px-3 py-2 text-base normal-case tracking-normal text-white outline-none placeholder:text-white/50"
                  style={{ border: "2px solid #FEE101", backgroundColor: "#0B6839" }}
                />
              </label>
            )}
            <label
              className="block uppercase"
              style={{ color: "#FEE101", fontWeight: 700, fontSize: 13, letterSpacing: "0.08em" }}
            >
              Stack / role
              <input
                value={stack}
                onChange={(event) => setStack(event.target.value)}
                placeholder="fullstack, rust, design..."
                className="mt-1 w-full px-3 py-2 text-base normal-case tracking-normal text-white outline-none placeholder:text-white/50"
                style={{ border: "2px solid #FEE101", backgroundColor: "#0B6839" }}
              />
            </label>
            <div className="flex items-center justify-between gap-3 px-3 py-2 text-white" style={{ backgroundColor: "#FF0080" }}>
              <p className="text-xs uppercase tracking-widest">
                Class <span className="font-bold">{klass}</span>
              </p>
              <button
                type="button"
                onClick={() => setClassSalt((n) => n + 1)}
                className="text-xs uppercase tracking-widest underline"
              >
                Shuffle
              </button>
            </div>
          </div>
        )}

        {error ? <p className="text-sm" style={{ color: "#FEE101" }}>{error}</p> : null}
      </section>

      <section className="space-y-4 lg:sticky lg:top-6">
        <div className="p-3" style={{ border: "1.5px solid #FEE101", backgroundColor: "rgba(0,0,0,0.25)" }}>
          <canvas
            ref={canvasRef}
            width={size.w}
            height={size.h}
            className="mx-auto h-auto w-full"
            style={{ aspectRatio: `${size.w} / ${size.h}`, backgroundColor: "#0B6839" }}
          />
        </div>
        <p
          className="text-center uppercase"
          style={{ color: "#FEE101", fontWeight: 700, fontSize: 13, letterSpacing: "0.08em" }}
        >
          Live preview · PNG export is {size.w}×{size.h}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <StripeButton label={busy === "download" ? "Saving..." : "Download"} onClick={() => void download()} disabled={!ready || busy !== null} />
          <StripeButton label={busy === "share" ? "Sharing..." : "Share to X"} onClick={() => void shareToX()} disabled={!ready || busy !== null} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p
              className="uppercase"
              style={{ color: "#FEE101", fontWeight: 700, fontSize: 13, letterSpacing: "0.08em" }}
            >
              Caption · {HASHTAG}
            </p>
            <button
              type="button"
              onClick={() => void copyCaption()}
              className="px-3 py-1 uppercase"
              style={{
                background: "#FEE101",
                color: "#0B6839",
                fontFamily: "var(--font-imbue)",
                fontWeight: 700,
                fontSize: 22,
                lineHeight: 1,
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <textarea
            readOnly
            value={caption}
            rows={8}
            className="w-full resize-none p-3 text-sm text-white"
            style={{ border: "1.5px solid #FEE101", backgroundColor: "rgba(0,0,0,0.25)" }}
          />
        </div>
      </section>
    </div>
  );
}
