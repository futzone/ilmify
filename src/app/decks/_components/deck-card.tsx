"use client";

import { MoreVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deckColorClasses } from "@/lib/deck-colors";
import type { Deck } from "@/lib/deck-types";

type Props = {
  deck: Deck;
  onEdit: (deck: Deck) => void;
  onDelete: (deck: Deck) => void;
};

export function DeckCard({ deck, onEdit, onDelete }: Props) {
  const t = useTranslations("decks");
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className={cn("size-4 shrink-0 rounded-full", deckColorClasses[deck.color])} />
          <CardTitle className="truncate">{deck.name}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="ml-auto size-11" aria-label={t("menu.open")}>
                  <MoreVertical className="size-5" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(deck)}>{t("menu.edit")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(deck)}>{t("menu.delete")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
