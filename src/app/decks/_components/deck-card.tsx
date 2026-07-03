"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deckColorClasses } from "@/lib/deck-colors";
import type { Deck } from "@/lib/db/types";

export function DeckCard({ deck }: { deck: Deck }) {
  const t = useTranslations("decks");
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className={cn("size-4 shrink-0 rounded-full", deckColorClasses[deck.color])} />
          <CardTitle className="truncate">{deck.name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {deck.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{deck.description}</p>
        )}
        <p className="text-xs text-muted-foreground">{t("cardCount", { count: 0 })}</p>
      </CardContent>
    </Card>
  );
}
