"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Music, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type MediaValue = File | null | undefined;
const MAX_BYTES = 5 * 1024 * 1024;

export function MediaUpload({
  kind,
  existingUrl,
  value,
  onChange,
  onError,
}: {
  kind: "image" | "audio";
  existingUrl?: string;
  value: MediaValue;
  onChange: (v: MediaValue) => void;
  onError: (msg: string) => void;
}) {
  const t = useTranslations("cards");
  const inputRef = useRef<HTMLInputElement>(null);

  // Ko'rsatiladigan manba: yangi File > (o'chirilmagan bo'lsa) mavjud URL.
  const previewUrl =
    value instanceof File ? URL.createObjectURL(value) : value === null ? undefined : existingUrl;

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // bir xil faylni qayta tanlashga ruxsat
    if (!file) return;
    if (file.size > MAX_BYTES) return onError(t("errors.fileTooLarge"));
    onChange(file);
  }

  function remove() {
    onChange(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={kind === "image" ? "image/*" : "audio/*"}
        className="hidden"
        onChange={pick}
      />
      {previewUrl ? (
        <div className="flex items-center gap-2">
          {kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element -- PB blob/URL, next/image shart emas
            <img src={previewUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
          ) : (
            <audio src={previewUrl} controls className="h-10" />
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("form.remove")}
            onClick={remove}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          className="w-fit gap-2"
          onClick={() => inputRef.current?.click()}
        >
          {kind === "image" ? <ImagePlus className="size-4" /> : <Music className="size-4" />}
          {kind === "image" ? t("form.addImage") : t("form.addAudio")}
        </Button>
      )}
    </div>
  );
}
