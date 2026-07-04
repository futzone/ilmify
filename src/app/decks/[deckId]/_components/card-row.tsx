"use client";

import { MoreVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card as UiCard, CardContent } from "@/components/ui/card";
import { cardStatusMeta } from "@/lib/card-status-colors";
import type { Card } from "@/lib/card-types";

export function CardRow({
  card,
  onEdit,
  onDelete,
}: {
  card: Card;
  onEdit: (c: Card) => void;
  onDelete: (c: Card) => void;
}) {
  const t = useTranslations("cards");
  const tStatus = useTranslations("cards.status");
  const meta = cardStatusMeta[card.status];
  return (
    <UiCard className="rounded-2xl">
      <CardContent className="flex items-center gap-3 py-4">
        {card.icon && <span className="text-2xl">{card.icon}</span>}
        {card.front.image && (
          // eslint-disable-next-line @next/next/no-img-element -- PB URL
          <img src={card.front.image} alt="" className="size-10 rounded-md object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{card.front.text || "—"}</p>
          <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("size-2 rounded-full", meta.dot)} />
            {tStatus(meta.key)}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="size-11" aria-label={t("menu.open")}>
                <MoreVertical className="size-5" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(card)}>{t("menu.edit")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(card)}>{t("menu.delete")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </UiCard>
  );
}
