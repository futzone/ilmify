import type { DeckColor } from "@/lib/db/types";

// Rang belgisi (dot / swatch) uchun Tailwind bg klasslari — light/dark'da mos.
export const deckColorClasses: Record<DeckColor, string> = {
  purple: "bg-violet-500",
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  pink: "bg-pink-500",
  teal: "bg-teal-500",
  slate: "bg-slate-500",
};
