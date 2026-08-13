import type { TimelinePhase } from "./types";

export const FIGMA_WIDTH = 1440;
export const FIGMA_HEIGHT = 12525;
export const APPLY_URL = "https://hacker-house-goa-2026.devfolio.co/";
export const CONTACT_MAIL =
  "https://mail.google.com/mail/?view=cm&fs=1&to=satapathyprayasu@gmail.com";

export const EASE_OUT_SOFT: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const EASE_OUT_SMOOTH: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const TIMELINE_PHASES: TimelinePhase[] = [
  {
    id: "registration-begins",
    name: "Registration Begins",
    when: "7 May 2026",
    purpose: "Applications open — start your HH GOA journey.",
  },
  {
    id: "open-trials",
    name: "Open Trials",
    when: "August 2026",
    purpose: "Skill-based challenges open to everyone.",
  },
  {
    id: "alpha-selections",
    name: "Alpha Selections",
    when: "Early Sept 2026",
    purpose: "First shortlist from Open Trials performance.",
  },
  {
    id: "beta-selections",
    name: "Beta Selections",
    when: "Early Sept 2026",
    purpose: "Deeper technical & portfolio review.",
  },
  {
    id: "charlie-selections",
    name: "Charlie Selections",
    when: "Mid Sept 2026",
    purpose: "Interviews and team-fit assessment.",
  },
  {
    id: "delta-selections",
    name: "Delta Selections",
    when: "Mid Sept 2026",
    purpose: "Final shortlist confirmed before partner matching.",
  },
  {
    id: "partner-trials",
    name: "Partner Trials",
    when: "September 2026",
    purpose: "Selection based on each partner's requirements and interests.",
  },
  {
    id: "rsvp-stake",
    name: "RSVP & Stake",
    when: "Late September",
    purpose: "Final confirmation of your team's participation.",
  },
  {
    id: "registration-ends",
    name: "Registration Ends",
    when: "1 October 2026",
    purpose: "Last day to register — no new entries accepted after this date.",
  },
  {
    id: "residency",
    name: "Residency",
    when: "28–31 October 2026",
    purpose: "247 builders come together to build, ship, and launch projects in Goa.",
  },
];

export const TIMELINE_ROW_ONE = TIMELINE_PHASES.slice(0, 5);
export const TIMELINE_ROW_TWO = TIMELINE_PHASES.slice(5, 10);

export const STATUS_STYLES: Record<string, string> = {
  Completed: "bg-brand-primary text-white",
  Running: "bg-brand-accent text-black",
  "To Be Started": "bg-transparent text-black/70 border border-black/30",
  Evaluated: "bg-brand-pink text-white",
  "Results Out": "bg-black text-brand-accent",
};

export const RANK_STYLES: Record<number, string> = {
  1: "bg-brand-accent text-black",
  2: "bg-black/15 text-black",
  3: "bg-brand-pink text-white",
};

export const NOTICE_ROTATIONS = [-2.5, 1.5, -1, 2, -1.5, 1, -2, 2.5];
export const NOTICE_PINS = ["bg-brand-pink", "bg-brand-accent", "bg-brand-primary"];

export const FAQS = [
  {
    id: "54-27256",
    question: "Who can participate in Hacker House Goa?",
    answer:
      "Anyone with a passion for building! Whether you're a developer, designer, product manager, or just someone with great ideas - you're welcome here. Teams of 1-3 people are encouraged, but solo participants are also accepted.",
  },
  {
    id: "54-27278",
    question: "How does the selection process work in Hacker House Goa?",
    answer:
      "- First, your team has to attend the shortlisting tasks\n- Top teams from shortlisting tasks are waitlisted\n- Best teams from the Waitlisted groups are selected for attending Hacker House Goa in-person.",
  },
  {
    id: "54-27294",
    question: "What should I bring to the event?",
    answer:
      "Bring your laptop, charger, any hardware you might need for your project, and your creative energy. We'll provide workspace, power outlets, WiFi, meals, and caffeine to keep you going.",
  },
  {
    id: "54-27310",
    question: "Is there a registration fee?",
    answer:
      "No! Participation in Hacker House Goa is completely free. We'll provide accommodation, meals, and all amenities during the 4-day event. You just need to get yourself to Goa!",
  },
  {
    id: "54-27326",
    question: "How are teams formed?",
    answer:
      "You can come with a pre-formed team or find teammates during our team formation session on Day 1. We'll have networking activities and a team matching board to help you find the perfect collaborators.",
  },
  {
    id: "54-27326_extra",
    question: "Can I start working on my project before the event?",
    answer:
      "You can brainstorm and plan, but all code must be written during the hackathon. Using existing libraries, APIs, and frameworks is encouraged - just don't bring pre-built solutions.",
  },
];

export const TASKS = [
  {
    id: "task1" as const,
    taskNumber: "Task #1",
    title: "HH Goa Frame / ID Card Generator",
    description:
      "Design your own HH Goa 2026 themed photo frame generator. Use that same generator to bring your teammates into one combined frame. Post it on X with a quick how-to on generating your own #FrameInGoa post using your generator — and you're done.",
    requirements: [
      "Instantly recognizable HH Goa 2026 identity",
      "1-click download + 1-click Share to X",
      "Works on any photo — no manual cropping",
      "Personalized: name, stack, a generated builder class",
      "Seconds from upload to shareable output",
      "Get to the top of the ladder and win the exclusive HH Goa ID",
      "Use #FrameInGoa to get featured in the Radar",
    ],
    briefUrl:
      "https://drive.google.com/file/d/11aAIBCdhngT0QWLPBNc2bJGLqXhghN3H/view?usp=sharing",
    deadline: "2026-08-13T23:59:59+05:30",
    deadlineLabel: "Aug 13, 11:59 PM IST",
    formUrl:
      "https://docs.google.com/forms/d/e/1FAIpQLSdayCHrUcqnBeFD9nYe2fOXgujV_BUvYQ0hsge8oRbeL2mj4w/viewform?pli=1",
    warnings: [
      "Your submission will be flagged as an error if your X post doesn't actually contain the hashtag #FrameInGoa.",
      "1 submission per team, please — once a team has registered, further submissions from that team will be rejected.",
    ],
  },
  {
    id: "task2" as const,
    taskNumber: "Task #2",
    title: "Voice-Enabled RAG Model",
    description:
      "Speak a question, get a grounded answer. Build a full voice-to-answer RAG pipeline — transcription, engineered chunking, vector retrieval, and generation — wired together end to end, fast and guardrailed.",
    requirements: [
      "Speak the question — real voice-to-text input, not typed",
      "Retrieval that's actually engineered — multiple chunking strategies, not one naive split",
      "Blazing-fast — full pipeline under 200ms",
      "P50 / P70 / P100 latency, benchmarked across real queries, not a lucky run",
      "Runs inside a real harness — retries, structured I/O, error recovery",
      "Guardrails that know when *not* to answer",
      "Use #RAGInGoa to get featured in the Radar",
    ],
    briefUrl:
      "https://docs.google.com/document/d/1gzPyuYMaJGnv7mjPZ7Z_e20VxP0j5PMOPi8WmBi8rFk/edit?tab=t.0#heading=h.6ql5mnt56wpa",
    deadline: "2026-08-22T23:59:59+05:30",
    deadlineLabel: "Aug 22, 11:59 PM IST",
    formUrl: "https://forms.gle/MNvCjcv23Hn2Eeu58",
    warnings: [
      "#RAGInGoa is compulsory — every video, on every platform, by every team member, must include it.",
      "1 submission per team — no resubmissions allowed, so make sure your build is final before you submit.",
    ],
  },
];

export const TERMS_SECTIONS = [
  { id: "acceptance", num: "01", title: "Acceptance of Terms" },
  { id: "eligibility", num: "02", title: "Eligibility & Registration" },
  { id: "selection", num: "03", title: "The Selection Process" },
  { id: "rsvp-stake", num: "04", title: "RSVP, Stake & Cancellations" },
  { id: "conduct", num: "05", title: "Code of Conduct" },
  { id: "ip", num: "06", title: "Intellectual Property" },
  { id: "media", num: "07", title: "Media & Publicity" },
  { id: "safety", num: "08", title: "Health, Safety & Travel" },
  { id: "partners", num: "09", title: "Sponsor & Partner Interactions" },
  { id: "liability", num: "10", title: "Limitation of Liability" },
  { id: "changes", num: "11", title: "Changes to These Terms" },
  { id: "law", num: "12", title: "Governing Law" },
  { id: "contact", num: "13", title: "Contact" },
] as const;
