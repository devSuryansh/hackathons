import { builderClass, passId } from "./builder-class";
import { coverCrop, loadUrl } from "./load-photo";

export type Format = "pfp" | "id" | "team";

export type RenderInput = {
  format: Format;
  photos: HTMLImageElement[];
  name: string;
  stack: string;
  teamName: string;
  classSalt: number;
};

const GREEN = "#0B6839";
const YELLOW = "#FEE101";
const PINK = "#FF0080";
const OFFWHITE = "#FFFBE8";
const INK = "#1A1A1A";

type Faces = { imbue: string; mono: string };

function typeface(): Faces {
  const root = getComputedStyle(document.documentElement);
  const imbue = root.getPropertyValue("--font-imbue").trim() || "Imbue, serif";
  const mono = root.getPropertyValue("--font-victor-mono").trim() || '"Victor Mono", monospace';
  return { imbue, mono };
}

const assetCache = new Map<string, HTMLImageElement>();

async function asset(src: string): Promise<HTMLImageElement> {
  const hit = assetCache.get(src);
  if (hit) return hit;
  const img = await loadUrl(src);
  assetCache.set(src, img);
  return img;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const crop = coverCrop(img, x, y, w, h);
  ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, crop.dx, crop.dy, crop.dw, crop.dh);
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxSize: number,
  minSize: number,
  family: string,
): number {
  let size = maxSize;
  ctx.font = `400 ${size}px ${family}`;
  while (size > minSize && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `400 ${size}px ${family}`;
  }
  return size;
}

function drawFooterCorners(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bar: number,
  faces: Faces,
) {
  ctx.save();
  ctx.fillStyle = GREEN;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = `700 24px ${faces.mono}, ui-monospace, monospace`;
  const y = h - bar / 2;
  ctx.fillText("OCT 28-31", 16, y);
  const tag = "#FrameInGoa";
  ctx.fillText(tag, w - 16 - ctx.measureText(tag).width, y);
  ctx.restore();
}

function drawDashedLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y: number,
  x2: number,
  color: string,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

export function canvasSize(format: Format): { w: number; h: number } {
  if (format === "pfp") return { w: 1080, h: 1080 };
  if (format === "id") return { w: 1080, h: 1480 };
  return { w: 1620, h: 1080 };
}

export async function renderCard(canvas: HTMLCanvasElement, input: RenderInput): Promise<void> {
  await document.fonts.ready;
  const { w, h } = canvasSize(input.format);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const faces = typeface();

  if (input.format === "pfp") {
    await drawPfp(ctx, w, h, input, faces);
    return;
  }
  if (input.format === "id") {
    await drawId(ctx, w, h, input, faces);
    return;
  }
  await drawTeam(ctx, w, h, input, faces);
}

async function drawPfp(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  input: RenderInput,
  faces: Faces,
) {
  const [hindi, studio] = await Promise.all([
    asset("/assets/goa_hindi.svg"),
    asset("/assets/2-47.svg"),
  ]);

  ctx.fillStyle = GREEN;
  ctx.fillRect(0, 0, w, h);

  const photo = input.photos[0];
  const insetX = 64;
  const insetTop = 72;
  const insetBot = 72;
  if (photo) {
    drawCover(ctx, photo, insetX, insetTop, w - insetX * 2, h - insetTop - insetBot);
  } else {
    ctx.fillStyle = "#094d2b";
    ctx.fillRect(insetX, insetTop, w - insetX * 2, h - insetTop - insetBot);
  }

  const frame = 64;
  const topBar = 72;
  const botBar = 72;

  ctx.fillStyle = YELLOW;
  ctx.fillRect(0, 0, w, topBar);
  ctx.fillRect(0, 0, frame, h);
  ctx.fillRect(w - frame, 0, frame, h);
  ctx.fillRect(0, h - botBar, w, botBar);
  ctx.fillStyle = PINK;
  ctx.fillRect(frame, topBar, w - frame * 2, 8);
  ctx.fillRect(frame, topBar, 8, h - topBar - botBar);
  ctx.fillRect(w - frame - 8, topBar, 8, h - topBar - botBar);
  ctx.fillRect(frame, h - botBar - 8, w - frame * 2, 8);

  ctx.save();
  ctx.fillStyle = GREEN;
  ctx.font = `400 42px ${faces.imbue}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("HH GOA '26", w / 2, 50);
  ctx.restore();

  drawFooterCorners(ctx, w, h, botBar, faces);

  ctx.drawImage(hindi, 16, 8, 56, 56);
  ctx.fillStyle = GREEN;
  ctx.fillRect(w - 148, 14, 128, 44);
  ctx.drawImage(studio, w - 138, 22, 108, 28);
}

async function drawId(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  input: RenderInput,
  faces: Faces,
) {
  const [sunrise, hindi, studio, palm, wordmark] = await Promise.all([
    asset("/assets/Sun%20rise.png"),
    asset("/assets/goa_hindi.svg"),
    asset("/assets/2-47.svg"),
    asset("/assets/036-vector-54-3934.svg"),
    asset("/assets/Hacker%20house.png"),
  ]);

  const name = input.name.trim() || "BUILDER";
  const stack = input.stack.trim() || "FULL STACK";
  const klass = builderClass(name, stack, input.classSalt);
  const id = passId(name, input.classSalt);

  ctx.fillStyle = GREEN;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.16;
  drawCover(ctx, sunrise, 0, 0, w, 420);
  ctx.globalAlpha = 1;

  ctx.fillStyle = YELLOW;
  ctx.fillRect(0, 0, w, 118);
  ctx.fillStyle = PINK;
  ctx.fillRect(0, 118, w, 12);

  ctx.fillStyle = INK;
  ctx.font = `700 22px ${faces.mono}`;
  ctx.textAlign = "left";
  ctx.fillText("BUILDER PASS  ·  2026", 48, 52);
  ctx.font = `500 18px ${faces.mono}`;
  ctx.fillText("HACKER HOUSE GOA", 48, 86);

  ctx.fillStyle = GREEN;
  ctx.fillRect(w - 184, 30, 152, 64);
  ctx.drawImage(studio, w - 168, 42, 120, 40);

  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.drawImage(palm, 740, 980, 420, 420);
  ctx.restore();

  const px = 64;
  const py = 168;
  const pw = w - 128;
  const ph = 620;
  roundRect(ctx, px - 8, py - 8, pw + 16, ph + 16, 28);
  ctx.fillStyle = YELLOW;
  ctx.fill();
  roundRect(ctx, px - 2, py - 2, pw + 4, ph + 4, 22);
  ctx.fillStyle = PINK;
  ctx.fill();
  ctx.save();
  roundRect(ctx, px, py, pw, ph, 20);
  ctx.clip();
  const photo = input.photos[0];
  if (photo) {
    drawCover(ctx, photo, px, py, pw, ph);
  } else {
    ctx.fillStyle = "#094d2b";
    ctx.fillRect(px, py, pw, ph);
  }
  ctx.restore();

  drawDashedLine(ctx, 48, 830, w - 48, YELLOW);

  ctx.fillStyle = OFFWHITE;
  ctx.textAlign = "left";
  const nameSize = fitText(ctx, name.toUpperCase(), w - 96, 92, 42, faces.imbue);
  ctx.font = `400 ${nameSize}px ${faces.imbue}`;
  ctx.fillText(name.toUpperCase(), 48, 920);

  ctx.fillStyle = YELLOW;
  ctx.font = `600 24px ${faces.mono}`;
  ctx.fillText(stack.toUpperCase(), 48, 968);

  const pillLabel = `CLASS: ${klass}`;
  ctx.font = `700 22px ${faces.mono}`;
  const pillW = Math.min(w - 96, Math.max(280, ctx.measureText(pillLabel).width + 48));
  roundRect(ctx, 48, 1000, pillW, 56, 8);
  ctx.fillStyle = PINK;
  ctx.fill();
  ctx.fillStyle = OFFWHITE;
  ctx.fillText(pillLabel, 68, 1038);

  ctx.fillStyle = OFFWHITE;
  ctx.font = `500 20px ${faces.mono}`;
  ctx.fillText(id, 48, 1120);

  ctx.drawImage(hindi, 48, 1260, 88, 88);
  ctx.drawImage(wordmark, 160, 1288, 280, 48);
  drawBarcode(ctx, w - 280, 1248, 220, 72, id);

  ctx.fillStyle = YELLOW;
  ctx.fillRect(0, h - 64, w, 64);
  ctx.fillStyle = PINK;
  ctx.fillRect(0, h - 72, w, 8);
  drawFooterCorners(ctx, w, h, 64, faces);
}

function drawBarcode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: string,
) {
  ctx.fillStyle = OFFWHITE;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = INK;
  let n = 0;
  for (let i = 0; i < seed.length; i += 1) n += seed.charCodeAt(i);
  let cursor = x + 8;
  while (cursor < x + w - 8) {
    n = (n * 1103515245 + 12345) & 0x7fffffff;
    const bar = 2 + (n % 5);
    const gap = 2 + ((n >> 4) % 4);
    ctx.fillRect(cursor, y + 8, bar, h - 16);
    cursor += bar + gap;
  }
}

async function drawTeam(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  input: RenderInput,
  faces: Faces,
) {
  const [sunrise, hindi, studio, palm] = await Promise.all([
    asset("/assets/Sun%20rise.png"),
    asset("/assets/goa_hindi.svg"),
    asset("/assets/2-47.svg"),
    asset("/assets/036-vector-54-3934.svg"),
  ]);

  const team = input.teamName.trim() || input.name.trim() || "CREW";
  const stack = input.stack.trim() || "MIXED STACK";
  const klass = builderClass(team, stack, input.classSalt);

  ctx.fillStyle = GREEN;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.18;
  drawCover(ctx, sunrise, 0, 0, w, h);
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.drawImage(palm, -60, 640, 480, 480);
  ctx.restore();

  ctx.fillStyle = YELLOW;
  ctx.fillRect(0, 0, w, 22);
  ctx.fillStyle = PINK;
  ctx.fillRect(0, 22, w, 10);

  ctx.fillStyle = OFFWHITE;
  ctx.font = `700 24px ${faces.mono}`;
  ctx.textAlign = "left";
  ctx.fillText("HACKER HOUSE GOA  26  ·  TEAM FRAME", 120, 78);
  ctx.drawImage(hindi, 36, 40, 56, 56);
  ctx.drawImage(studio, w - 168, 48, 120, 40);

  const photos = input.photos.slice(0, 3);
  const count = Math.max(photos.length, 1);
  const gap = 28;
  const well = Math.min(520, (w - 96 - gap * (count - 1)) / count);
  const total = count * well + (count - 1) * gap;
  let x = (w - total) / 2;
  const y = 140;

  for (let i = 0; i < count; i += 1) {
    roundRect(ctx, x - 8, y - 8, well + 16, well + 16, 24);
    ctx.fillStyle = i === 1 ? PINK : YELLOW;
    ctx.fill();
    ctx.save();
    roundRect(ctx, x, y, well, well, 18);
    ctx.clip();
    const photo = photos[i];
    if (photo) {
      drawCover(ctx, photo, x, y, well, well);
    } else {
      ctx.fillStyle = "#094d2b";
      ctx.fillRect(x, y, well, well);
    }
    ctx.restore();
    x += well + gap;
  }

  ctx.fillStyle = YELLOW;
  ctx.textAlign = "center";
  const nameSize = fitText(ctx, team.toUpperCase(), w - 120, 96, 48, faces.imbue);
  ctx.font = `400 ${nameSize}px ${faces.imbue}`;
  ctx.fillText(team.toUpperCase(), w / 2, 780);

  const pillLabel = `CLASS: ${klass}`;
  ctx.font = `700 22px ${faces.mono}`;
  const pillW = Math.max(320, ctx.measureText(pillLabel).width + 48);
  roundRect(ctx, w / 2 - pillW / 2, 820, pillW, 56, 8);
  ctx.fillStyle = PINK;
  ctx.fill();
  ctx.fillStyle = OFFWHITE;
  ctx.fillText(pillLabel, w / 2, 858);

  ctx.fillStyle = OFFWHITE;
  ctx.font = `500 22px ${faces.mono}`;
  ctx.fillText(stack.toUpperCase(), w / 2, 930);

  ctx.fillStyle = YELLOW;
  ctx.fillRect(0, h - 56, w, 56);
  ctx.fillStyle = PINK;
  ctx.fillRect(0, h - 64, w, 8);
  drawFooterCorners(ctx, w, h, 56, faces);
}
