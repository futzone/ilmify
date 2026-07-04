import { pb } from "@/lib/pb/client";
import {
  type Card,
  type CardInput,
  type CardStatus,
  type Grade,
  cardInputSchema,
  mapRecordToCard,
} from "@/lib/card-types";
import { nextStatus } from "@/lib/card-status";
import { createReview } from "@/lib/pb/reviews";

const COL = "ilmify_cards";

function applyFile(fd: FormData, field: string, value: File | null | undefined) {
  if (value instanceof File) fd.set(field, value);
  else if (value === null) fd.set(field, ""); // o'chirish
  // undefined -> tegilmaydi (update'da mavjudni saqlaydi)
}

function buildFormData(input: CardInput, extra: Record<string, string>): FormData {
  const fd = new FormData();
  fd.set("frontText", input.front.text);
  fd.set("backText", input.back.text);
  fd.set("icon", input.icon ?? "");
  for (const [k, v] of Object.entries(extra)) fd.set(k, v);
  applyFile(fd, "frontImage", input.front.image);
  applyFile(fd, "frontAudio", input.front.audio);
  applyFile(fd, "backImage", input.back.image);
  applyFile(fd, "backAudio", input.back.audio);
  return fd;
}

export async function listCards(deckId: string): Promise<Card[]> {
  const records = await pb.collection(COL).getFullList({ filter: `deck = "${deckId}"`, sort: "-updated" });
  return records.map(mapRecordToCard);
}

export async function countCardsByDeck(deckId: string): Promise<number> {
  const res = await pb.collection(COL).getList(1, 1, { filter: `deck = "${deckId}"` });
  return res.totalItems;
}

export async function createCard(deckId: string, input: CardInput): Promise<Card> {
  cardInputSchema.parse(input);
  const owner = pb.authStore.record?.id;
  if (!owner) throw new Error("Not authenticated");
  const fd = buildFormData(input, { deck: deckId, owner, status: "new", easyStreak: "0" });
  const record = await pb.collection(COL).create(fd);
  return mapRecordToCard(record);
}

export async function updateCard(id: string, input: CardInput): Promise<Card> {
  cardInputSchema.parse(input);
  const fd = buildFormData(input, {});
  const record = await pb.collection(COL).update(id, fd);
  return mapRecordToCard(record);
}

export async function deleteCard(id: string): Promise<void> {
  await pb.collection(COL).delete(id);
}

export async function gradeCard(args: {
  cardId: string;
  deckId: string;
  current: CardStatus;
  easyStreak: number;
  grade: Grade;
}): Promise<void> {
  const { cardId, deckId, current, easyStreak, grade } = args;
  await createReview({ card: cardId, deck: deckId, grade }); // avval jurnal (analitika manbai)
  const next = nextStatus(current, easyStreak, grade);
  await pb.collection(COL).update(cardId, {
    status: next.status,
    easyStreak: next.easyStreak,
    lastReviewed: new Date().toISOString(),
  });
}
