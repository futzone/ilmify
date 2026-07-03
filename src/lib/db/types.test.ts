import { describe, expect, it } from "vitest";
import { deckInputSchema, DECK_COLORS } from "@/lib/db/types";

describe("deckInputSchema", () => {
  it("accepts a valid input", () => {
    const parsed = deckInputSchema.parse({ name: "Ingliz", description: "Unit 1", color: "purple" });
    expect(parsed.name).toBe("Ingliz");
    expect(parsed.color).toBe("purple");
  });
  it("trims the name", () => {
    expect(deckInputSchema.parse({ name: "  Ingliz  ", color: "blue" }).name).toBe("Ingliz");
  });
  it("rejects an empty name", () => {
    expect(() => deckInputSchema.parse({ name: "   ", color: "blue" })).toThrow();
  });
  it("rejects a name longer than 60 chars", () => {
    expect(() => deckInputSchema.parse({ name: "x".repeat(61), color: "blue" })).toThrow();
  });
  it("rejects an unknown color", () => {
    expect(() => deckInputSchema.parse({ name: "Ok", color: "gold" })).toThrow();
  });
  it("exposes 8 colors", () => {
    expect(DECK_COLORS).toHaveLength(8);
  });
  it("rejects a description longer than 500 chars", () => {
    expect(() =>
      deckInputSchema.parse({ name: "Ok", description: "x".repeat(501), color: "blue" }),
    ).toThrow();
  });
});
