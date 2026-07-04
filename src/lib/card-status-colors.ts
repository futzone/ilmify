import type { CardStatus } from "@/lib/card-types";

// status -> nuqta rangi (badge/dot) + i18n kalit. cards.status.<key>.
export const cardStatusMeta: Record<CardStatus, { dot: string; key: CardStatus }> = {
  new: { dot: "bg-slate-400", key: "new" },
  hard: { dot: "bg-red-500", key: "hard" },
  easy: { dot: "bg-emerald-500", key: "easy" },
  memorized: { dot: "bg-violet-500", key: "memorized" },
};

// Analitika donut/chart uchun hex ranglar (recharts).
export const cardStatusHex: Record<CardStatus, string> = {
  new: "#94a3b8",
  hard: "#ef4444",
  easy: "#10b981",
  memorized: "#8b5cf6",
};
