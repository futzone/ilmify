"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { createDeck } from "@/lib/db/decks";
import type { DeckInput } from "@/lib/db/types";
import { DeckList } from "./deck-list";
import { DeckFormDialog } from "./deck-form-dialog";

export function DecksClient() {
  const t = useTranslations("decks");
  const [formOpen, setFormOpen] = useState(false);

  async function handleSubmit(input: DeckInput) {
    await createDeck(input);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button className="min-h-11 rounded-2xl" onClick={() => setFormOpen(true)}>
          {t("new")}
        </Button>
      </div>

      <DeckList onCreate={() => setFormOpen(true)} />

      <DeckFormDialog open={formOpen} onOpenChange={setFormOpen} onSubmit={handleSubmit} />
    </div>
  );
}
