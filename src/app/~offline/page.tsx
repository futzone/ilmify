import { getTranslations } from "next-intl/server";

export default async function OfflinePage() {
  const t = await getTranslations("offline");
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted-foreground">{t("message")}</p>
    </div>
  );
}
