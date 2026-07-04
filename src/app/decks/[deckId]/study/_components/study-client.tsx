"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useCards, useGradeCard } from "@/lib/pb/card-queries";
import { nextStatus } from "@/lib/card-status";
import type { Card, Grade } from "@/lib/card-types";
import { StudyCard } from "./study-card";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function StudyClient({ deckId }: { deckId: string }) {
  const t = useTranslations("study");
  const { data: cards, isLoading } = useCards(deckId);
  const gradeM = useGradeCard(deckId);

  const [queue, setQueue] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [requeued, setRequeued] = useState<Set<string>>(new Set());
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kartalar yuklangandan navbatni bir marta aralashtirib boshlash.
  useEffect(() => {
    if (!started && cards && cards.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- init on data load
      setQueue(shuffle(cards));
      setStarted(true);
    }
  }, [cards, started]);

  if (isLoading || (!started && (cards?.length ?? 0) > 0)) {
    return <div className="h-56 animate-pulse rounded-2xl bg-muted" />;
  }

  if ((cards?.length ?? 0) === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-muted-foreground">{t("empty")}</p>
        <Button render={<Link href={`/decks/${deckId}`} />}>{t("summary.backToDeck")}</Button>
      </div>
    );
  }

  const done = index >= queue.length;
  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <h2 className="text-xl font-semibold">{t("summary.title")}</h2>
        <p className="text-muted-foreground">{t("summary.reviewed", { count: reviewed })}</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setQueue(shuffle(cards ?? []));
              setIndex(0);
              setReviewed(0);
              setRequeued(new Set());
              setFlipped(false);
            }}
          >
            {t("summary.again")}
          </Button>
          <Button render={<Link href={`/decks/${deckId}`} />}>{t("summary.backToDeck")}</Button>
        </div>
      </div>
    );
  }

  const current = queue[index];

  async function grade(g: Grade) {
    setError(null);
    try {
      await gradeM.mutateAsync({
        cardId: current.id,
        current: current.status,
        easyStreak: current.easyStreak,
        grade: g,
      });
    } catch {
      return setError(t("gradeFailed"));
    }
    setReviewed((n) => n + 1);
    const next = nextStatus(current.status, current.easyStreak, g);
    const updated = { ...current, status: next.status, easyStreak: next.easyStreak };
    // "Qiyin" bo'lsa va hali qayta qo'yilmagan bo'lsa — navbat oxiriga qo'shish.
    if (g === "hard" && !requeued.has(current.id)) {
      setQueue((q) => [...q, updated]);
      setRequeued((s) => new Set(s).add(current.id));
    }
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-sm text-muted-foreground">
        {t("progress", { done: reviewed, total: queue.length })}
      </p>
      {error && <p className="text-center text-sm text-destructive">{error}</p>}
      <StudyCard card={current} flipped={flipped} onFlip={() => setFlipped(true)} onGrade={grade} />
    </div>
  );
}
