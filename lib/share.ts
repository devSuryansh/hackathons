export const HASHTAG = "#FrameInGoa";
export const SITE_URL = "https://hhgoa-cmd-shift-elite.vercel.app";

export function shareCaption(
  kind: "pfp" | "id" | "team",
  generatorUrl: string,
  cardUrl?: string,
): string {
  const mine =
    kind === "pfp"
      ? "I made myself a custom profile frame."
      : kind === "id"
        ? "I made myself a custom id card."
        : "We made ourself a team frame.";

  const lines = [`${mine} Make yours for Hacker House Goa 2026.`, ""];
  if (cardUrl) {
    lines.push(cardUrl, "");
  }
  if (generatorUrl) {
    lines.push(generatorUrl);
  }
  lines.push("", "4 days in Goa. 28-31 Oct. hhgoa.com", "", HASHTAG);
  return lines.join("\n");
}

export function tweetIntent(text: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}
