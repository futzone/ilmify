import { describe, expect, it } from "vitest";
import { cardInputSchema, mapRecordToReview } from "@/lib/card-types";

const validSide = { text: "Salom", image: null, audio: null };

describe("cardInputSchema", () => {
  it("accepts front with text", () => {
    expect(() => cardInputSchema.parse({ front: validSide, back: validSide, icon: "" })).not.toThrow();
  });
  it("rejects empty front (no text, no image)", () => {
    expect(() =>
      cardInputSchema.parse({ front: { text: "  ", image: null, audio: null }, back: validSide, icon: "" }),
    ).toThrow();
  });
});

describe("mapRecordToReview", () => {
  it("maps a PB record to a Review", () => {
    const r = mapRecordToReview({
      id: "r1", card: "c1", deck: "d1", grade: "easy", owner: "u1",
      created: "2026-07-04 10:00:00.000Z", collectionId: "x", collectionName: "ilmify_reviews",
    });
    expect(r).toEqual({ id: "r1", card: "c1", deck: "d1", grade: "easy", owner: "u1", created: "2026-07-04 10:00:00.000Z" });
  });
});
