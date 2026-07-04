"use client";

import { useTranslations } from "next-intl";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { useReviews } from "@/lib/pb/review-queries";
import { useAllCards } from "@/lib/pb/card-queries";
import { useDecks } from "@/lib/pb/deck-queries";
import {
  computeStreak, dailyReviewCounts, accuracyOverTime, statusDistribution, growth,
} from "@/lib/analytics";
import { cardStatusHex } from "@/lib/card-status-colors";
import { CARD_STATUSES } from "@/lib/card-types";
import { StatCard } from "./stat-card";

const DAYS = 30;

export function AnalyticsClient() {
  const t = useTranslations("analytics");
  const tStatus = useTranslations("cards.status");
  const { data: reviews, isLoading: rl } = useReviews();
  const { data: cards, isLoading: cl } = useAllCards();
  const { data: decks } = useDecks();

  if (rl || cl) return <div className="h-64 animate-pulse rounded-2xl bg-muted" />;

  const allReviews = reviews ?? [];
  const allCards = cards ?? [];
  const today = new Date().toISOString().slice(0, 10);

  if (allReviews.length === 0) {
    return <p className="py-16 text-center text-muted-foreground">{t("empty")}</p>;
  }

  const streak = computeStreak(allReviews.map((r) => r.created), today);
  const daily = dailyReviewCounts(allReviews, DAYS, today);
  const accuracy = accuracyOverTime(allReviews, DAYS, today).map((d) => ({ ...d, accuracy: d.accuracy ?? 0 }));
  const dist = statusDistribution(allCards);
  const g = growth(daily);
  const memorizedPct = allCards.length ? Math.round((dist.memorized / allCards.length) * 100) : 0;
  const growthLabel = g > 0 ? t("growthUp", { pct: g }) : g < 0 ? t("growthDown", { pct: Math.abs(g) }) : t("growthFlat");

  const pieData = CARD_STATUSES.map((s) => ({ name: tStatus(s), value: dist[s], key: s }));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={t("streak")} value={t("streakDays", { count: streak })} />
        <StatCard label={t("totalDecks")} value={String(decks?.length ?? 0)} />
        <StatCard label={t("totalCards")} value={String(allCards.length)} />
        <StatCard label={t("memorizedPct")} value={`${memorizedPct}%`} />
      </div>

      <Card className="rounded-2xl">
        <CardContent className="flex flex-col gap-3 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t("dailyReviews")}</span>
            <span className={g >= 0 ? "text-sm text-emerald-600" : "text-sm text-red-600"}>{growthLabel}</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={daily}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} interval={4} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={24} />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="flex flex-col gap-3 py-4">
          <span className="text-sm font-medium">{t("accuracy")}</span>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={accuracy}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} interval={4} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} width={28} />
              <Tooltip />
              <Line type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="flex flex-col gap-3 py-4">
          <span className="text-sm font-medium">{t("distribution")}</span>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                {pieData.map((d) => (
                  <Cell key={d.key} fill={cardStatusHex[d.key]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
