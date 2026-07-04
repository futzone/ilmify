import { describe, expect, it } from "vitest";
import { nextStatus } from "@/lib/card-status";

describe("nextStatus", () => {
  it("hard -> hard, resets streak", () => {
    expect(nextStatus("easy", 2, "hard")).toEqual({ status: "hard", easyStreak: 0 });
  });
  it("medium on new -> hard, streak 0", () => {
    expect(nextStatus("new", 0, "medium")).toEqual({ status: "hard", easyStreak: 0 });
  });
  it("medium keeps existing non-new status, resets streak", () => {
    expect(nextStatus("easy", 2, "medium")).toEqual({ status: "easy", easyStreak: 0 });
  });
  it("easy increments streak below threshold", () => {
    expect(nextStatus("new", 0, "easy")).toEqual({ status: "easy", easyStreak: 1 });
    expect(nextStatus("easy", 1, "easy")).toEqual({ status: "easy", easyStreak: 2 });
  });
  it("third consecutive easy -> memorized, streak capped at 3", () => {
    expect(nextStatus("easy", 2, "easy")).toEqual({ status: "memorized", easyStreak: 3 });
  });
  it("easy on memorized stays memorized", () => {
    expect(nextStatus("memorized", 3, "easy")).toEqual({ status: "memorized", easyStreak: 3 });
  });
});
