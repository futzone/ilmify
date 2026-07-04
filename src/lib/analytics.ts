import type { Review, Card, CardStatus } from "@/lib/card-types";

function day(iso: string): string {
  return iso.slice(0, 10);
}

function addDays(date: string, delta: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function computeStreak(reviewDates: string[], today: string): number {
  const days = new Set(reviewDates.map(day));
  if (days.size === 0) return 0;
  let cursor = day(today);
  if (!days.has(cursor)) cursor = addDays(cursor, -1); // bugungi kunga grace
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function dailyReviewCounts(
  reviews: Review[],
  days: number,
  today: string,
): { date: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of reviews) counts.set(day(r.created), (counts.get(day(r.created)) ?? 0) + 1);
  const out: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(day(today), -i);
    out.push({ date: d, count: counts.get(d) ?? 0 });
  }
  return out;
}

export function accuracyOverTime(
  reviews: Review[],
  days: number,
  today: string,
): { date: string; accuracy: number | null }[] {
  const totals = new Map<string, { correct: number; total: number }>();
  for (const r of reviews) {
    const d = day(r.created);
    const e = totals.get(d) ?? { correct: 0, total: 0 };
    e.total++;
    if (r.grade === "easy" || r.grade === "medium") e.correct++;
    totals.set(d, e);
  }
  const out: { date: string; accuracy: number | null }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(day(today), -i);
    const e = totals.get(d);
    out.push({ date: d, accuracy: e ? Math.round((e.correct / e.total) * 100) : null });
  }
  return out;
}

export function statusDistribution(cards: Card[]): Record<CardStatus, number> {
  const dist: Record<CardStatus, number> = { new: 0, hard: 0, easy: 0, memorized: 0 };
  for (const c of cards) dist[c.status]++;
  return dist;
}

export function growth(daily: { count: number }[]): number {
  const n = daily.length;
  const last7 = daily.slice(Math.max(0, n - 7)).reduce((s, d) => s + d.count, 0);
  const prev7 = daily.slice(Math.max(0, n - 14), Math.max(0, n - 7)).reduce((s, d) => s + d.count, 0);
  if (prev7 === 0) return last7 > 0 ? 100 : 0;
  return Math.round(((last7 - prev7) / prev7) * 100);
}
