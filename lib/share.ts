export const HASHTAG = "#FrameInGoa";
export const SITE_URL = "https://hhgoa-cmd-shift-elite.vercel.app";

export function shareCaption(kind: "pfp" | "id" | "team"): string {
  const mine =
    kind === "pfp"
      ? "I made myself a custom profile frame."
      : kind === "id"
        ? "I made myself a custom id card."
        : "We made ourself a team frame.";

  return [
    `${mine} Make yours for Hacker House Goa 2026.`,
    "",
    SITE_URL,
    "",
    "4 days in Goa. 28-31 Oct. hhgoa.com",
    HASHTAG,
  ].join("\n");
}

export function tweetIntent(text: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}
