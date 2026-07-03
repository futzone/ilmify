"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { createDeck, deleteDeck, updateDeck } from "@/lib/db/decks";
import type { Deck, DeckInput } from "@/lib/db/types";
import { DeckList } from "./deck-list";
import { DeckFormDialog } from "./deck-form-dialog";
import { DeleteDeckDialog } from "./delete-deck-dialog";

export function DecksClient() {
  const t = useTranslations("decks");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Deck | undefined>(undefined);
  const [deleting, setDeleting] = useState<Deck | null>(null);

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }
  function openEdit(deck: Deck) {
    setEditing(deck);
    setFormOpen(true);
  }

  async function handleSubmit(input: DeckInput) {
    if (editing) await updateDeck(editing.id, input);
    else await createDeck(input);
  }

  async function handleDelete() {
    if (deleting) await deleteDeck(deleting.id);
    setDeleting(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button className="min-h-11 rounded-2xl" onClick={openCreate}>
          {t("new")}
        </Button>
      </div>

      <DeckList onCreate={openCreate} onEdit={openEdit} onDelete={setDeleting} />

      <DeckFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        deck={editing}
        onSubmit={handleSubmit}
      />
      <DeleteDeckDialog
        deck={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
