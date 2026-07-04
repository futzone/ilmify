"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { CardStatus } from "@/lib/card-types";

export type StatusFilter = "all" | CardStatus;
const ORDER: StatusFilter[] = ["all", "new", "hard", "easy", "memorized"];

export function StatusFilterBar({
  value,
  counts,
  onChange,
}: {
  value: StatusFilter;
  counts: Record<StatusFilter, number>;
  onChange: (v: StatusFilter) => void;
}) {
  const t = useTranslations("cards.status");
  return (
    <div className="flex flex-wrap gap-2">
      {ORDER.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          aria-pressed={value === s}
          className={cn(
            "min-h-9 rounded-full border px-3 text-sm transition",
            value === s ? "border-brand bg-brand/10 text-brand" : "border-border text-muted-foreground",
          )}
        >
          {t(s)} ({counts[s]})
        </button>
      ))}
    </div>
  );
}
