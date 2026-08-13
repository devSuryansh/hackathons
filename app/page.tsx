import { GeneratorApp } from "@/components/generator/GeneratorApp";

export default function HomePage() {
  return (
    <main className="relative min-h-full overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[240px] bg-cover bg-center opacity-25"
        style={{ backgroundImage: "url('/assets/Sun%20rise.png')" }}
      />
      <img
        src="/assets/036-vector-54-3934.svg"
        alt=""
        className="pointer-events-none absolute -left-16 bottom-0 w-64 opacity-20 sm:w-80"
      />
      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-6">
        <img src="/assets/Hacker%20house.png" alt="Hacker House" className="h-8 w-auto sm:h-10" />
        <img src="/assets/2-47.svg" alt="2:47" className="h-7 w-auto sm:h-8" />
      </header>
      <section className="relative mx-auto w-full max-w-6xl px-4 pb-8 pt-2">
        <p
          className="uppercase"
          style={{ color: "#FEE101", fontWeight: 700, fontSize: 13, letterSpacing: "0.16em" }}
        >
          HH Goa 2026 · Task 1
        </p>
        <h1 className="font-heading mt-2 max-w-3xl text-6xl uppercase leading-[0.9] sm:text-8xl" style={{ color: "#FEE101" }}>
          Frame yourself in.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/90 sm:text-base">
          Upload a photo. Get a PFP frame or a Builder ID. Download it, then share on X with{" "}
          <span style={{ color: "#FEE101" }}>#FrameInGoa</span>. No login.
        </p>
      </section>
      <GeneratorApp />
      <footer className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-8 text-xs uppercase tracking-widest" style={{ color: "#FEE101" }}>
        <span>Oct 28-31 · Goa</span>
        <img src="/assets/goa_hindi.svg" alt="" className="h-10 w-10" />
        <span>2:47 studio</span>
      </footer>
    </main>
  );
}
