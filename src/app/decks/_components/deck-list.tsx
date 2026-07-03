"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { listDecks } from "@/lib/db/decks";
import { DeckCard } from "./deck-card";

export function DeckList({ onCreate }: { onCreate: () => void }) {
  const t = useTranslations("decks");
  const decks = useLiveQuery(() => listDecks());

  // undefined = yuklanmoqda
  if (decks === undefined) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  // [] = bo'sh
  if (decks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-16 text-center">
        <h2 className="text-lg font-semibold">{t("empty.title")}</h2>
        <p className="max-w-sm text-sm text-muted-foreground">{t("empty.description")}</p>
        <Button className="min-h-11 rounded-2xl" onClick={onCreate}>
          {t("empty.cta")}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {decks.map((deck) => (
        <DeckCard key={deck.id} deck={deck} />
      ))}
    </div>
  );
}
