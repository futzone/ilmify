"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
import type { Card, CardInput } from "@/lib/card-types";
import { MediaUpload, type MediaValue } from "./media-upload";

const EMOJIS = ["📘", "📗", "🧠", "🔤", "🔢", "🌍", "🧪", "🎵", "⭐", "❓"];

export function CardEditorDialog({
  open,
  onOpenChange,
  card,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  card?: Card;
  onSubmit: (input: CardInput) => Promise<void>;
}) {
  const t = useTranslations("cards");
  const [frontText, setFrontText] = useState("");
  const [backText, setBackText] = useState("");
  const [icon, setIcon] = useState("");
  const [frontImage, setFrontImage] = useState<MediaValue>(undefined);
  const [frontAudio, setFrontAudio] = useState<MediaValue>(undefined);
  const [backImage, setBackImage] = useState<MediaValue>(undefined);
  const [backAudio, setBackAudio] = useState<MediaValue>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- dialog ochilganda prop-sync
      setFrontText(card?.front.text ?? "");
      setBackText(card?.back.text ?? "");
      setIcon(card?.icon ?? "");
      setFrontImage(undefined);
      setFrontAudio(undefined);
      setBackImage(undefined);
      setBackAudio(undefined);
      setError(null);
    }
  }, [open, card]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (frontText.trim().length === 0 && !(frontImage instanceof File) && !card?.front.image) {
      return setError(t("errors.frontRequired"));
    }
    setSaving(true);
    try {
      await onSubmit({
        front: { text: frontText.trim(), image: frontImage, audio: frontAudio },
        back: { text: backText.trim(), image: backImage, audio: backAudio },
        icon,
      });
      onOpenChange(false);
    } catch {
      setError(t("errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex max-h-[80vh] flex-col gap-4 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{card ? t("form.editTitle") : t("form.createTitle")}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="front-text">{t("form.front")}</Label>
            <Textarea
              id="front-text"
              value={frontText}
              onChange={(e) => setFrontText(e.target.value)}
              placeholder={t("form.textPlaceholder")}
              autoFocus
            />
            <MediaUpload kind="image" existingUrl={card?.front.image} value={frontImage} onChange={setFrontImage} onError={setError} />
            <MediaUpload kind="audio" existingUrl={card?.front.audio} value={frontAudio} onChange={setFrontAudio} onError={setError} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="back-text">{t("form.back")}</Label>
            <Textarea
              id="back-text"
              value={backText}
              onChange={(e) => setBackText(e.target.value)}
              placeholder={t("form.textPlaceholder")}
            />
            <MediaUpload kind="image" existingUrl={card?.back.image} value={backImage} onChange={setBackImage} onError={setError} />
            <MediaUpload kind="audio" existingUrl={card?.back.audio} value={backAudio} onChange={setBackAudio} onError={setError} />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("form.icon")}</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  aria-label={em}
                  aria-pressed={icon === em}
                  onClick={() => setIcon(icon === em ? "" : em)}
                  className={`size-11 rounded-full text-xl ring-2 transition ${icon === em ? "ring-ring" : "ring-transparent"}`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("form.cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {card ? t("form.save") : t("form.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
