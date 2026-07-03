import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db/db";
import { createDeck, deleteDeck, getDeck, listDecks, updateDeck } from "@/lib/db/decks";

beforeEach(async () => {
  await db.decks.clear();
});

describe("deck repository", () => {
  it("createDeck fills id and timestamps, parentId null", async () => {
    const deck = await createDeck({ name: "Ingliz", color: "purple" });
    expect(deck.id).toMatch(/[0-9a-f-]{36}/);
    expect(deck.name).toBe("Ingliz");
    expect(deck.description).toBe("");
    expect(deck.parentId).toBeNull();
    expect(deck.createdAt).toBeGreaterThan(0);
    expect(deck.updatedAt).toBe(deck.createdAt);
  });

  it("created deck appears in listDecks", async () => {
    const deck = await createDeck({ name: "Ingliz", color: "purple" });
    const all = await listDecks();
    expect(all.map((d) => d.id)).toContain(deck.id);
  });

  it("listDecks orders by updatedAt desc", async () => {
    let clock = 1000;
    const spy = vi.spyOn(Date, "now").mockImplementation(() => (clock += 1000));
    try {
      const a = await createDeck({ name: "A", color: "blue" });
      const b = await createDeck({ name: "B", color: "green" });
      await updateDeck(a.id, { name: "A2", color: "blue" }); // a becomes newest
      const ids = (await listDecks()).map((d) => d.id);
      expect(ids[0]).toBe(a.id);
      expect(ids[1]).toBe(b.id);
    } finally {
      spy.mockRestore();
    }
  });

  it("updateDeck changes fields and updatedAt but not createdAt", async () => {
    const deck = await createDeck({ name: "Old", color: "red" });
    const updated = await updateDeck(deck.id, { name: "New", description: "d", color: "teal" });
    expect(updated.name).toBe("New");
    expect(updated.description).toBe("d");
    expect(updated.color).toBe("teal");
    expect(updated.createdAt).toBe(deck.createdAt);
    expect(updated.updatedAt).toBeGreaterThanOrEqual(deck.updatedAt);
  });

  it("updateDeck throws for a missing id", async () => {
    await expect(updateDeck("nope", { name: "X", color: "blue" })).rejects.toThrow();
  });

  it("deleteDeck removes the deck and is idempotent", async () => {
    const deck = await createDeck({ name: "Bye", color: "amber" });
    await deleteDeck(deck.id);
    expect(await getDeck(deck.id)).toBeUndefined();
    await expect(deleteDeck(deck.id)).resolves.toBeUndefined(); // idempotent
  });

  it("createDeck rejects invalid input", async () => {
    await expect(createDeck({ name: "  ", color: "purple" })).rejects.toThrow();
  });
});
