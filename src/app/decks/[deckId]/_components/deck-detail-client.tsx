"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCards, useCreateCard, useUpdateCard, useDeleteCard } from "@/lib/pb/card-queries";
import type { Card, CardInput, CardStatus } from "@/lib/card-types";
import { CardEditorDialog } from "./card-editor-dialog";
import { CardRow } from "./card-row";
import { StatusFilterBar, type StatusFilter } from "./status-filter";
import { DeleteCardDialog } from "./delete-card-dialog";

export function DeckDetailClient({ deckId }: { deckId: string }) {
  const t = useTranslations("cards");
  const { data: cards, isLoading, error } = useCards(deckId);
  const createM = useCreateCard(deckId);
  const updateM = useUpdateCard(deckId);
  const deleteM = useDeleteCard(deckId);

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Card | undefined>(undefined);
  const [deleting, setDeleting] = useState<Card | null>(null);

  const counts = useMemo(() => {
    const base: Record<StatusFilter, number> = { all: 0, new: 0, hard: 0, easy: 0, memorized: 0 };
    for (const c of cards ?? []) {
      base.all++;
      base[c.status]++;
    }
    return base;
  }, [cards]);

  const visible = useMemo(
    () => (cards ?? []).filter((c) => filter === "all" || c.status === filter),
    [cards, filter],
  );

  function openCreate() {
    setEditing(undefined);
    setEditorOpen(true);
  }
  function openEdit(card: Card) {
    setEditing(card);
    setEditorOpen(true);
  }
  async function handleSubmit(input: CardInput) {
    if (editing) await updateM.mutateAsync({ id: editing.id, input });
    else await createM.mutateAsync(input);
  }
  async function handleDelete() {
    if (deleting) await deleteM.mutateAsync(deleting.id);
    setDeleting(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" className="gap-2" render={<Link href="/decks" />}>
          <ArrowLeft className="size-4" />
          {t("back")}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href={`/decks/${deckId}/study`} />}>
            {t("study")}
          </Button>
          <Button onClick={openCreate}>{t("new")}</Button>
        </div>
      </div>

      {!isLoading && !error && (cards?.length ?? 0) > 0 && (
        <StatusFilterBar value={filter} counts={counts} onChange={setFilter} />
      )}

      {isLoading && (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{t("errors.loadFailed")}</p>}

      {!isLoading && !error && (cards?.length ?? 0) === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <h2 className="text-lg font-semibold">{t("empty.title")}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">{t("empty.description")}</p>
          <Button onClick={openCreate}>{t("empty.cta")}</Button>
        </div>
      )}

      {!isLoading && !error && (cards?.length ?? 0) > 0 && (
        <div className="grid gap-3">
          {visible.map((c) => (
            <CardRow key={c.id} card={c} onEdit={openEdit} onDelete={setDeleting} />
          ))}
        </div>
      )}

      <CardEditorDialog open={editorOpen} onOpenChange={setEditorOpen} card={editing} onSubmit={handleSubmit} />
      <DeleteCardDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)} onConfirm={handleDelete} />
    </div>
  );
}
