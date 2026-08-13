export type TimelineStatus =
  | "Completed"
  | "Running"
  | "To Be Started"
  | "Evaluated"
  | "Results Out";

export type TimelinePhase = {
  id: string;
  name: string;
  when: string;
  purpose: string;
};

export type Notice = {
  id: string;
  text: string;
  linkLabel?: string;
  linkUrl?: string;
  createdAt: string;
};

export type LeaderboardEntry = {
  id: string;
  name: string;
  socialLink: string;
  postLink: string;
  views: number;
  score: number;
};
