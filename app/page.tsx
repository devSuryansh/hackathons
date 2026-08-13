import { GeneratorApp } from "@/components/generator/GeneratorApp";

export default function HomePage() {
  return (
    <main className="relative min-h-full">
      <div className="relative isolate min-h-[70vh]">
        <img
          src="/assets/Sun%20rise.png"
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="pointer-events-none absolute inset-0 bg-[#0B6839]/35" />
        <header className="relative mx-auto flex w-full items-center justify-between gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <img src="/assets/Hacker%20house.png" alt="Hacker House" className="h-8 w-auto sm:h-10" />
          <img src="/assets/2-47.svg" alt="2:47" className="h-7 w-auto sm:h-8" />
        </header>
        <section className="relative mx-auto w-full px-4 pb-8 pt-8 sm:px-6 sm:pt-12 lg:px-8">
          <p
            className="uppercase"
            style={{ color: "#FEE101", fontWeight: 700, fontSize: 13, letterSpacing: "0.16em" }}
          >
            HH Goa 2026 · Task 1
          </p>
          <h1
            className="font-heading mt-2 max-w-3xl text-6xl uppercase leading-[0.9] sm:text-8xl"
            style={{ color: "#FEE101" }}
          >
            Frame yourself in.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white sm:text-base">
            Upload a photo. Get a PFP frame or a Builder ID. Download it, then share on X with{" "}
            <span style={{ color: "#FEE101" }}>#FrameInGoa</span>. No login.
          </p>
        </section>

        <GeneratorApp />
      </div>

      <footer className="relative mt-8 overflow-visible">
        <img
          src="/assets/Hacker%20house.png"
          alt=""
          className="pointer-events-none absolute bottom-6 left-4 h-14 w-auto opacity-40 sm:left-8 sm:h-20"
        />
        <img
          src="/assets/179-vector-54-30944.svg"
          alt=""
          className="pointer-events-none absolute bottom-0 right-4 h-40 w-auto opacity-30 sm:right-10 sm:h-52"
        />
        <div
          className="relative mx-auto flex w-full items-center justify-between px-4 py-16 text-xs uppercase tracking-widest sm:px-6 lg:px-8"
          style={{ color: "#FEE101" }}
        >
          <span>Oct 28-31 · Goa</span>
          <img src="/assets/goa_hindi.svg" alt="" className="h-10 w-10" />
          <span>2:47 studio</span>
        </div>
      </footer>
    </main>
  );
}
