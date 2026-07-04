"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCard,
  updateCard,
  deleteCard,
  listCards,
  countCardsByDeck,
  gradeCard,
} from "@/lib/pb/cards";
import type { CardInput, CardStatus, Grade } from "@/lib/card-types";

export function useCards(deckId: string) {
  return useQuery({ queryKey: ["cards", deckId], queryFn: () => listCards(deckId) });
}

export function useDeckCardCount(deckId: string) {
  return useQuery({ queryKey: ["cardCount", deckId], queryFn: () => countCardsByDeck(deckId) });
}

function useInvalidate(deckId: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["cards", deckId] });
    qc.invalidateQueries({ queryKey: ["cardCount", deckId] });
    qc.invalidateQueries({ queryKey: ["reviews"] });
  };
}

export function useCreateCard(deckId: string) {
  const invalidate = useInvalidate(deckId);
  return useMutation({
    mutationFn: (input: CardInput) => createCard(deckId, input),
    onSuccess: invalidate,
  });
}

export function useUpdateCard(deckId: string) {
  const invalidate = useInvalidate(deckId);
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CardInput }) => updateCard(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteCard(deckId: string) {
  const invalidate = useInvalidate(deckId);
  return useMutation({ mutationFn: (id: string) => deleteCard(id), onSuccess: invalidate });
}

export function useGradeCard(deckId: string) {
  const invalidate = useInvalidate(deckId);
  return useMutation({
    mutationFn: (args: { cardId: string; current: CardStatus; easyStreak: number; grade: Grade }) =>
      gradeCard({ ...args, deckId }),
    onSuccess: invalidate,
  });
}
