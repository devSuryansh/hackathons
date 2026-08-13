export function absoluteUrl(path = ""): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const vercel = process.env.VERCEL_URL;
  const base = explicit
    ? explicit
    : vercelProd
      ? `https://${vercelProd}`
      : vercel
        ? `https://${vercel}`
        : "https://hhgoa-cmd-shift-elite.vercel.app";
  return `${base.replace(/\/$/, "")}${path}`;
}
