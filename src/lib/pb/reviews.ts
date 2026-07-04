import { pb } from "@/lib/pb/client";
import { type Review, type Grade, mapRecordToReview } from "@/lib/card-types";

const COL = "ilmify_reviews";

export async function createReview(input: { card: string; deck: string; grade: Grade }): Promise<Review> {
  const owner = pb.authStore.record?.id;
  if (!owner) throw new Error("Not authenticated");
  const record = await pb.collection(COL).create({ ...input, owner });
  return mapRecordToReview(record);
}

export async function listReviews(deckId?: string): Promise<Review[]> {
  const records = await pb.collection(COL).getFullList({
    sort: "created",
    ...(deckId ? { filter: `deck = "${deckId}"` } : {}),
  });
  return records.map(mapRecordToReview);
}
