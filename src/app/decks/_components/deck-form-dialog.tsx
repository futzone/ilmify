"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DECK_COLORS, type Deck, type DeckColor, type DeckInput } from "@/lib/db/types";
import { deckColorClasses } from "@/lib/deck-colors";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deck?: Deck;
  onSubmit: (input: DeckInput) => Promise<void>;
};

export function DeckFormDialog({ open, onOpenChange, deck, onSubmit }: Props) {
  const t = useTranslations("decks.form");
  const tErr = useTranslations("decks.errors");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<DeckColor>("purple");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Dialog ochilganda formani deck bilan (yoki bo'sh) to'ldirish
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional prop-sync on dialog open
      setName(deck?.name ?? "");
      setDescription(deck?.description ?? "");
      setColor(deck?.color ?? "purple");
      setError(null);
    }
  }, [open, deck]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0) return setError(tErr("nameRequired"));
    if (trimmed.length > 60) return setError(tErr("nameTooLong"));
    if (description.trim().length > 500) return setError(tErr("descriptionTooLong"));
    setSaving(true);
    try {
      await onSubmit({ name: trimmed, description: description.trim(), color });
      onOpenChange(false);
    } catch {
      setError(tErr("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{deck ? t("editTitle") : t("createTitle")}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="deck-name">{t("nameLabel")}</Label>
            <Input
              id="deck-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="deck-desc">{t("descriptionLabel")}</Label>
            <Textarea
              id="deck-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              maxLength={500}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("colorLabel")}</Label>
            <div className="flex flex-wrap gap-2">
              {DECK_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  aria-pressed={color === c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "size-11 rounded-full ring-2 ring-transparent transition",
                    deckColorClasses[c],
                    color === c && "ring-ring ring-offset-2 ring-offset-background",
                  )}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {deck ? t("save") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
