import { describe, expect, it } from "vitest";
import { deckInputSchema, DECK_COLORS, mapRecordToDeck } from "@/lib/deck-types";

describe("deckInputSchema", () => {
  it("accepts valid input and trims name", () => {
    expect(deckInputSchema.parse({ name: "  A  ", color: "purple" }).name).toBe("A");
  });
  it("rejects empty name", () => {
    expect(() => deckInputSchema.parse({ name: " ", color: "blue" })).toThrow();
  });
  it("rejects name > 60", () => {
    expect(() => deckInputSchema.parse({ name: "x".repeat(61), color: "blue" })).toThrow();
  });
  it("rejects unknown color", () => {
    expect(() => deckInputSchema.parse({ name: "A", color: "gold" })).toThrow();
  });
});

describe("mapRecordToDeck", () => {
  it("maps a PB record to a Deck", () => {
    const deck = mapRecordToDeck({
      id: "abc123", name: "Ingliz", description: "", color: "purple",
      owner: "u1", created: "2026-07-03 10:00:00.000Z", updated: "2026-07-03 10:00:00.000Z",
      collectionId: "x", collectionName: "ilmify_decks",
    });
    expect(deck).toEqual({
      id: "abc123", name: "Ingliz", description: "", color: "purple",
      owner: "u1", created: "2026-07-03 10:00:00.000Z", updated: "2026-07-03 10:00:00.000Z",
    });
  });
});
