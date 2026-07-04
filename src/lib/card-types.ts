import { z } from "zod";
import type { RecordModel } from "pocketbase";
import { pb } from "@/lib/pb/client";

export const CARD_STATUSES = ["new", "hard", "easy", "memorized"] as const;
export type CardStatus = (typeof CARD_STATUSES)[number];

export const GRADES = ["hard", "medium", "easy"] as const;
export type Grade = (typeof GRADES)[number];

export type CardSide = { text: string; image?: string; audio?: string };
export type CardSideInput = { text: string; image?: File | null; audio?: File | null };
export type CardInput = { front: CardSideInput; back: CardSideInput; icon: string };

export type Card = {
  id: string;
  deck: string;
  front: CardSide;
  back: CardSide;
  icon: string;
  status: CardStatus;
  easyStreak: number;
  lastReviewed: string | null;
  owner: string;
  created: string;
  updated: string;
};

export type Review = {
  id: string;
  card: string;
  deck: string;
  grade: Grade;
  owner: string;
  created: string;
};

// Fayl File | null | undefined; zod tekshirmaydi (env-bog'liq), faqat matn qoidasi.
const sideSchema = z.object({
  text: z.string(),
  image: z.any().optional(),
  audio: z.any().optional(),
});

export const cardInputSchema = z
  .object({ front: sideSchema, back: sideSchema, icon: z.string() })
  .superRefine((val, ctx) => {
    const hasFront = val.front.text.trim().length > 0 || val.front.image != null;
    if (!hasFront) {
      ctx.addIssue({ code: "custom", message: "Old tomon bo'sh", path: ["front"] });
    }
  });

export const gradeSchema = z.enum(GRADES);

function fileUrl(r: RecordModel, field: string): string | undefined {
  const name = r[field] as string | undefined;
  return name ? pb.files.getURL(r, name) : undefined;
}

export function mapRecordToCard(r: RecordModel): Card {
  return {
    id: r.id,
    deck: r.deck,
    front: { text: r.frontText ?? "", image: fileUrl(r, "frontImage"), audio: fileUrl(r, "frontAudio") },
    back: { text: r.backText ?? "", image: fileUrl(r, "backImage"), audio: fileUrl(r, "backAudio") },
    icon: r.icon ?? "",
    status: r.status,
    easyStreak: r.easyStreak ?? 0,
    lastReviewed: r.lastReviewed || null,
    owner: r.owner,
    created: r.created,
    updated: r.updated,
  };
}

export function mapRecordToReview(r: RecordModel): Review {
  return { id: r.id, card: r.card, deck: r.deck, grade: r.grade, owner: r.owner, created: r.created };
}
