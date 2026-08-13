"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ConfirmParticipationModal } from "@/components/modals/ConfirmParticipationModal";
import { TASKS } from "@/lib/constants";
import { formatCountdown } from "@/lib/format";

function FrameMockup() {
  return (
    <div className="relative w-[210px] h-[210px] shrink-0">
      <div className="absolute inset-0 rounded-full border-[3px] border-dashed border-brand-pink" />
      <div className="absolute inset-3 rounded-full bg-brand-primary flex items-center justify-center overflow-hidden">
        <svg width="88" height="88" viewBox="0 0 24 24" fill="none" stroke="#fffbe8" strokeWidth="1.4">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" />
        </svg>
      </div>
      <span
        aria-hidden
        className="absolute -top-2 -right-1 w-9 h-9 rounded-full bg-brand-accent flex items-center justify-center text-[16px] shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
      >
        🌴
      </span>
      <span
        aria-hidden
        className="absolute -bottom-2 -left-6 rotate-[-9deg] bg-white rounded-md shadow-[4px_5px_0_rgba(0,0,0,0.2)] px-3 py-2.5 w-[132px]"
      >
        <span className="block h-1.5 w-9 bg-brand-primary rounded-full mb-1.5" />
        <span className="block h-1 w-[70px] bg-black/20 rounded-full mb-1" />
        <span className="block h-1 w-12 bg-black/20 rounded-full mb-1" />
        <span className="inline-block font-heading font-bold text-brand-pink text-[9px] uppercase tracking-wide">
          Builder ID
        </span>
      </span>
    </div>
  );
}

function RagMockup() {
  return (
    <div className="relative w-[210px] h-[210px] shrink-0">
      <div className="absolute inset-0 rounded-full border-[3px] border-dashed border-brand-pink" />
      <div className="absolute inset-3 rounded-full bg-brand-primary flex items-center justify-center overflow-hidden">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#fffbe8" strokeWidth="1.4">
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0" />
          <path d="M12 18v4" />
          <path d="M8 22h8" />
        </svg>
      </div>
      <span
        aria-hidden
        className="absolute -top-2 -right-1 w-9 h-9 rounded-full bg-brand-accent flex items-center justify-center text-[16px] shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
      >
        🎙️
      </span>
      <span
        aria-hidden
        className="absolute -bottom-2 -left-6 rotate-[-9deg] bg-white rounded-md shadow-[4px_5px_0_rgba(0,0,0,0.2)] px-3 py-2.5 w-[132px]"
      >
        <span className="flex items-end gap-[3px] h-4 mb-1.5" aria-hidden>
          <span className="block w-[3px] h-[40%] bg-brand-primary rounded-full" />
          <span className="block w-[3px] h-[80%] bg-brand-primary rounded-full" />
          <span className="block w-[3px] h-[55%] bg-brand-primary rounded-full" />
          <span className="block w-[3px] h-full bg-brand-primary rounded-full" />
          <span className="block w-[3px] h-[65%] bg-brand-primary rounded-full" />
          <span className="block w-[3px] h-[30%] bg-brand-primary rounded-full" />
        </span>
        <span className="inline-block font-heading font-bold text-brand-pink text-[9px] uppercase tracking-wide">
          Ask Anything
        </span>
      </span>
    </div>
  );
}

function TaskCard({
  task,
  mockup,
  onConfirm,
}: {
  task: (typeof TASKS)[number];
  mockup: ReactNode;
  onConfirm: () => void;
}) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const deadline = new Date(task.deadline);
    const tick = () => setRemaining(deadline.getTime() - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [task.deadline]);

  const closed = remaining !== null && remaining <= 0;

  return (
    <div className="flex flex-row items-center gap-9 bg-brand-offwhite rounded-lg px-10 py-9 max-w-[820px] shadow-[8px_10px_0_rgba(0,0,0,0.25)]">
      {mockup}
      <div className="flex flex-col gap-4 text-left">
        <div>
          <p className="font-heading font-extrabold uppercase tracking-[0.08em] text-brand-pink text-[12.5px] mb-1.5">
            {task.taskNumber}
          </p>
          <h3 className="font-heading font-bold text-brand-primary text-[24px] leading-tight mb-2">
            {task.title}
          </h3>
          <p className="font-body text-black/80 text-[14px] leading-snug max-w-[46ch]">{task.description}</p>
        </div>
        <ul className="flex flex-col gap-1.5 items-start">
          {task.requirements.map((item) => (
            <li key={item} className="font-body text-black/70 text-[12.5px] flex gap-2">
              <span className="text-brand-pink shrink-0">✦</span>
              {item}
            </li>
          ))}
        </ul>
        {remaining !== null ? (
          <div
            className={`font-body text-[12px] uppercase tracking-wide px-3 py-2 rounded-md border w-fit ${
              closed
                ? "border-red-500/40 text-red-600 bg-red-50"
                : "border-brand-pink/40 text-brand-pink bg-brand-pink/5"
            }`}
          >
            {closed
              ? `Submissions closed — the ${task.deadlineLabel} deadline has passed`
              : `Closes in ${formatCountdown(remaining)} · ${task.deadlineLabel}`}
          </div>
        ) : null}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={onConfirm}
            disabled={closed}
            className={`font-heading font-bold uppercase text-[13.5px] rounded-full px-6 py-2.5 transition-opacity ${
              closed
                ? "bg-black/15 text-black/40 cursor-not-allowed"
                : "bg-brand-pink text-white hover:opacity-90"
            }`}
          >
            {closed ? "Submissions Closed" : "Confirm Participation"}
          </button>
          <a
            href={task.briefUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-heading font-bold uppercase text-[13.5px] border border-brand-pink text-brand-pink rounded-full px-6 py-2.5 hover:bg-brand-pink hover:text-white transition-colors"
          >
            Task Details ↗
          </a>
        </div>
      </div>
    </div>
  );
}

export function Tasks() {
  const [open, setOpen] = useState<"task1" | "task2" | null>(null);
  const active = TASKS.find((task) => task.id === open);

  return (
    <section
      id="tasks"
      aria-label="Tasks"
      className="w-full h-full flex flex-col items-center justify-center bg-brand-primary px-6"
    >
      <div className="flex flex-col items-center gap-8 max-w-[1440px] w-full">
        <div className="text-center">
          <p className="font-heading font-extrabold uppercase tracking-[0.1em] text-brand-accent text-[15px] mb-2">
            Build This
          </p>
          <h2 className="font-heading font-bold uppercase text-brand-white text-[42px] leading-[1.05]">
            Tasks
          </h2>
        </div>
        <TaskCard task={TASKS[0]} mockup={<FrameMockup />} onConfirm={() => setOpen("task1")} />
        <TaskCard task={TASKS[1]} mockup={<RagMockup />} onConfirm={() => setOpen("task2")} />
      </div>
      {active ? (
        <ConfirmParticipationModal
          taskNumber={active.taskNumber}
          formUrl={active.formUrl}
          warnings={active.warnings}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </section>
  );
}
