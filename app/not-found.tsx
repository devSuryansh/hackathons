import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-xs uppercase tracking-[0.25em] text-brand-accent">Missing frame</p>
      <h1 className="font-heading mt-3 text-5xl uppercase text-brand-accent">That card is gone</h1>
      <p className="mt-4 text-sm text-white/80">Generate a new one and share it again.</p>
      <Link
        href="/"
        className="font-heading mt-8 bg-brand-accent px-8 py-3 text-3xl uppercase text-brand-primary"
      >
        Make yours
      </Link>
    </main>
  );
}
