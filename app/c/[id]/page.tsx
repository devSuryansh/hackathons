import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadCard } from "@/lib/card-store";
import { absoluteUrl } from "@/lib/site";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const image = absoluteUrl(`/api/cards/${id}`);
  const title = "HH Goa 2026 · #FrameInGoa";
  const description =
    "Builder frame from Hacker House Goa 2026. Make yours, then post with #FrameInGoa.";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/c/${id}`),
      images: [{ url: image, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function CardPage({ params }: Props) {
  const { id } = await params;
  if (!/^[a-f0-9]{12}$/.test(id)) notFound();
  const card = await loadCard(id);
  if (!card) notFound();

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center px-4 py-10">
      <p className="text-xs uppercase tracking-[0.25em] text-brand-accent">#FrameInGoa</p>
      <h1 className="font-heading mt-3 text-5xl uppercase text-brand-accent">Framed in Goa</h1>
      {/* Dynamic card bytes, not a static import. */}
      <img
        src={`/api/cards/${id}`}
        alt="Generated HH Goa 2026 graphic"
        className="mt-8 h-auto w-full border border-brand-accent/50"
      />
      <Link
        href="/"
        className="font-heading mt-8 bg-brand-accent px-8 py-3 text-3xl uppercase text-brand-primary"
      >
        Make yours
      </Link>
    </main>
  );
}
