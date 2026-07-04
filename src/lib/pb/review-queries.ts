"use client";

import { useQuery } from "@tanstack/react-query";
import { listReviews } from "@/lib/pb/reviews";

export function useReviews(deckId?: string) {
  return useQuery({ queryKey: ["reviews", deckId ?? "all"], queryFn: () => listReviews(deckId) });
}
