import { db } from "@/lib/db/db";
import { type Deck, type DeckInput, deckInputSchema } from "@/lib/db/types";

export async function createDeck(input: DeckInput): Promise<Deck> {
  const parsed = deckInputSchema.parse(input);
  const now = Date.now();
  const deck: Deck = {
    id: crypto.randomUUID(),
    name: parsed.name,
    description: parsed.description ?? "",
    color: parsed.color,
    parentId: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.decks.add(deck);
  return deck;
}

export async function listDecks(): Promise<Deck[]> {
  return db.decks.orderBy("updatedAt").reverse().toArray();
}

export async function getDeck(id: string): Promise<Deck | undefined> {
  return db.decks.get(id);
}

export async function updateDeck(id: string, input: DeckInput): Promise<Deck> {
  const parsed = deckInputSchema.parse(input);
  const existing = await db.decks.get(id);
  if (!existing) throw new Error(`Deck not found: ${id}`);
  // Guard against Date.now() resolution ties with other rows: ensure the new
  // updatedAt is strictly greater than every updatedAt currently in the table
  // (not just this row's own), so ordering by updatedAt desc stays deterministic.
  const latest = await db.decks.orderBy("updatedAt").last();
  const updatedAt = Math.max(Date.now(), existing.updatedAt + 1, (latest?.updatedAt ?? 0) + 1);
  const updated: Deck = {
    ...existing,
    name: parsed.name,
    description: parsed.description ?? "",
    color: parsed.color,
    updatedAt,
  };
  await db.decks.put(updated);
  return updated;
}

export async function deleteDeck(id: string): Promise<void> {
  await db.decks.delete(id);
}
