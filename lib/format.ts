export function formatViews(views: number): string {
  if (views >= 1e6) {
    return `${(views / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (views >= 1e3) {
    return `${(views / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return String(views);
}

export function formatNoticeDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

export function noticeFontSize(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words <= 12) return "text-[17px] leading-snug";
  if (words <= 25) return "text-[14.5px] leading-snug";
  if (words <= 38) return "text-[13px] leading-snug";
  return "text-[11.5px] leading-snug";
}
