"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card as UiCard, CardContent } from "@/components/ui/card";
import type { Card, CardSide } from "@/lib/card-types";

function SideView({ side }: { side: CardSide }) {
  return (
    <div className="flex flex-col items-center gap-3">
      {side.text && <p className="text-center text-lg">{side.text}</p>}
      {side.image && (
        // eslint-disable-next-line @next/next/no-img-element -- PB URL
        <img src={side.image} alt="" className="max-h-48 rounded-lg object-contain" />
      )}
      {side.audio && <audio src={side.audio} controls />}
    </div>
  );
}

export function StudyCard({
  card,
  flipped,
  onFlip,
  onGrade,
}: {
  card: Card;
  flipped: boolean;
  onFlip: () => void;
  onGrade: (grade: "hard" | "medium" | "easy") => void;
}) {
  const t = useTranslations("study");
  return (
    <div className="flex flex-col gap-4">
      <UiCard className="min-h-56 rounded-2xl">
        <CardContent className="flex min-h-56 flex-col items-center justify-center gap-6 py-8">
          {card.icon && <span className="text-3xl">{card.icon}</span>}
          <SideView side={card.front} />
          {flipped && (
            <>
              <hr className="w-full border-border" />
              <SideView side={card.back} />
            </>
          )}
        </CardContent>
      </UiCard>

      {!flipped ? (
        <Button className="min-h-12" onClick={onFlip}>
          {t("showAnswer")}
        </Button>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" className="min-h-12" onClick={() => onGrade("hard")}>
            {t("hard")}
          </Button>
          <Button variant="outline" className="min-h-12" onClick={() => onGrade("medium")}>
            {t("medium")}
          </Button>
          <Button variant="outline" className="min-h-12" onClick={() => onGrade("easy")}>
            {t("easy")}
          </Button>
        </div>
      )}
    </div>
  );
}
