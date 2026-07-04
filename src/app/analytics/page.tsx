import { getTranslations } from "next-intl/server";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AnalyticsClient } from "./_components/analytics-client";

export default async function AnalyticsPage() {
  const t = await getTranslations("analytics");
  return (
    <AuthGuard>
      <div className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-6 px-6 py-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <AnalyticsClient />
      </div>
    </AuthGuard>
  );
}
