import Dexie, { type EntityTable } from "dexie";
import type { Deck } from "@/lib/db/types";

const db = new Dexie("ilmify") as Dexie & {
  decks: EntityTable<Deck, "id">;
};

// version 1: decks jadvali. Primary key = id; indekslar: updatedAt (tartib), parentId (kelajak).
db.version(1).stores({
  decks: "id, updatedAt, parentId",
});

export { db };
