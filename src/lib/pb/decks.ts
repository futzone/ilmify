import { pb } from "@/lib/pb/client";
import { type Deck, type DeckInput, deckInputSchema, mapRecordToDeck } from "@/lib/deck-types";

const COL = "ilmify_decks";

export async function listDecks(): Promise<Deck[]> {
  const records = await pb.collection(COL).getFullList({ sort: "-updated" });
  return records.map(mapRecordToDeck);
}

export async function createDeck(input: DeckInput): Promise<Deck> {
  const parsed = deckInputSchema.parse(input);
  const owner = pb.authStore.record?.id;
  if (!owner) throw new Error("Not authenticated");
  const record = await pb.collection(COL).create({
    name: parsed.name, description: parsed.description ?? "", color: parsed.color, owner,
  });
  return mapRecordToDeck(record);
}

export async function updateDeck(id: string, input: DeckInput): Promise<Deck> {
  const parsed = deckInputSchema.parse(input);
  const record = await pb.collection(COL).update(id, {
    name: parsed.name, description: parsed.description ?? "", color: parsed.color,
  });
  return mapRecordToDeck(record);
}

export async function deleteDeck(id: string): Promise<void> {
  await pb.collection(COL).delete(id);
}
