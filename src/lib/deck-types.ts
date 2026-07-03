import { z } from "zod";
import type { RecordModel } from "pocketbase";

export const DECK_COLORS = [
  "purple", "blue", "green", "amber", "red", "pink", "teal", "slate",
] as const;
export type DeckColor = (typeof DECK_COLORS)[number];

export type Deck = {
  id: string;
  name: string;
  description: string;
  color: DeckColor;
  owner: string;
  created: string;
  updated: string;
};

export const deckInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(500).optional(),
  color: z.enum(DECK_COLORS),
});
export type DeckInput = z.infer<typeof deckInputSchema>;

export function mapRecordToDeck(record: RecordModel): Deck {
  return {
    id: record.id,
    name: record.name,
    description: record.description ?? "",
    color: record.color,
    owner: record.owner,
    created: record.created,
    updated: record.updated,
  };
}
