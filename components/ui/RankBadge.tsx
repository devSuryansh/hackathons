import { RANK_STYLES } from "@/lib/constants";

export function RankBadge({ rank }: { rank: number }) {
  const style = RANK_STYLES[rank] ?? "bg-black/10 text-black/70";
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-heading font-bold text-[12px] ${style}`}
    >
      {rank}
    </span>
  );
}
