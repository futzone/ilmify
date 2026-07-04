import { describe, expect, it } from "vitest";
import { computeStreak, dailyReviewCounts, accuracyOverTime, statusDistribution, growth } from "@/lib/analytics";
import type { Review, Card } from "@/lib/card-types";

const rev = (created: string, grade: Review["grade"] = "easy"): Review =>
  ({ id: created + grade, card: "c", deck: "d", grade, owner: "u", created });

describe("computeStreak", () => {
  it("returns 0 for no reviews", () => {
    expect(computeStreak([], "2026-07-04")).toBe(0);
  });
  it("counts consecutive days ending today", () => {
    expect(computeStreak(["2026-07-04 09:00:00.000Z", "2026-07-03 09:00:00.000Z", "2026-07-02 08:00:00.000Z"], "2026-07-04")).toBe(3);
  });
  it("grace: today empty but yesterday reviewed", () => {
    expect(computeStreak(["2026-07-03 09:00:00.000Z", "2026-07-02 09:00:00.000Z"], "2026-07-04")).toBe(2);
  });
  it("breaks on a gap", () => {
    expect(computeStreak(["2026-07-04 09:00:00.000Z", "2026-07-01 09:00:00.000Z"], "2026-07-04")).toBe(1);
  });
});

describe("dailyReviewCounts", () => {
  it("fills zero days across the window", () => {
    const out = dailyReviewCounts([rev("2026-07-04 09:00:00.000Z"), rev("2026-07-04 10:00:00.000Z")], 3, "2026-07-04");
    expect(out).toEqual([
      { date: "2026-07-02", count: 0 },
      { date: "2026-07-03", count: 0 },
      { date: "2026-07-04", count: 2 },
    ]);
  });
});

describe("accuracyOverTime", () => {
  it("computes (easy+medium)/total percent, null when no reviews", () => {
    const out = accuracyOverTime(
      [rev("2026-07-04 09:00:00.000Z", "easy"), rev("2026-07-04 10:00:00.000Z", "hard")],
      2, "2026-07-04",
    );
    expect(out).toEqual([
      { date: "2026-07-03", accuracy: null },
      { date: "2026-07-04", accuracy: 50 },
    ]);
  });
});

describe("statusDistribution", () => {
  it("counts each status", () => {
    const card = (status: Card["status"]): Card =>
      ({ id: status, deck: "d", front: { text: "" }, back: { text: "" }, icon: "", status, easyStreak: 0, lastReviewed: null, owner: "u", created: "", updated: "" });
    expect(statusDistribution([card("new"), card("easy"), card("easy"), card("memorized")])).toEqual({ new: 1, hard: 0, easy: 2, memorized: 1 });
  });
});

describe("growth", () => {
  it("positive when last 7 days exceed prior 7", () => {
    const daily = Array.from({ length: 14 }, (_, i) => ({ count: i < 7 ? 1 : 2 })); // prev7=7, last7=14
    expect(growth(daily)).toBe(100);
  });
  it("zero prior with activity -> 100", () => {
    const daily = Array.from({ length: 14 }, (_, i) => ({ count: i < 7 ? 0 : 3 }));
    expect(growth(daily)).toBe(100);
  });
});
