"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createDeck, deleteDeck, listDecks, updateDeck } from "@/lib/pb/decks";
import type { DeckInput } from "@/lib/deck-types";

const KEY = ["decks"];

export function useDecks() {
  return useQuery({ queryKey: KEY, queryFn: listDecks });
}

export function useCreateDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DeckInput) => createDeck(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DeckInput }) => updateDeck(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDeck(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
