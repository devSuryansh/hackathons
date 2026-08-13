"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

type ConfirmParticipationModalProps = {
  taskNumber: string;
  formUrl: string;
  warnings: string[];
  onClose: () => void;
};

export function ConfirmParticipationModal({
  taskNumber,
  formUrl,
  warnings,
  onClose,
}: ConfirmParticipationModalProps) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center px-5"
      onClick={onClose}
    >
      <div
        className="bg-brand-offwhite rounded-lg p-7 w-full max-w-[400px] shadow-[0_12px_0_rgba(0,0,0,0.25)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className="font-heading font-extrabold uppercase tracking-[0.08em] text-brand-pink text-[12px] mb-1.5">
              {taskNumber}
            </p>
            <h3 className="font-heading font-bold text-brand-primary text-[22px] uppercase leading-tight">
              Confirm Participation
            </h3>
          </div>
          <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-md px-4 py-3.5 flex flex-col gap-2.5">
            <a
              href={formUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-heading font-bold uppercase text-[12.5px] text-center bg-brand-primary text-white rounded-md px-4 py-2.5 hover:opacity-90 transition-opacity"
            >
              Open Official Submission Form ↗
            </a>
            <ul className="flex flex-col gap-1.5">
              {warnings.map((warning) => (
                <li key={warning} className="font-body text-black/70 text-[11px] leading-snug flex gap-1.5">
                  <span className="text-brand-pink shrink-0">⚠</span>
                  {warning}
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="self-start font-body text-[13px] text-black/50 hover:text-brand-pink transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
