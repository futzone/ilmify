import type { CardStatus, Grade } from "@/lib/card-types";

const EASY_THRESHOLD = 3;

export function nextStatus(
  current: CardStatus,
  easyStreak: number,
  grade: Grade,
): { status: CardStatus; easyStreak: number } {
  if (grade === "hard") return { status: "hard", easyStreak: 0 };
  if (grade === "medium") {
    return { status: current === "new" ? "hard" : current, easyStreak: 0 };
  }
  const streak = easyStreak + 1;
  if (streak >= EASY_THRESHOLD) return { status: "memorized", easyStreak: EASY_THRESHOLD };
  return { status: "easy", easyStreak: streak };
}
