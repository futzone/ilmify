import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";

export default async function Home() {
  const t = await getTranslations();
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {t("common.appName")}
        </h1>
        <p className="text-lg font-medium text-brand">{t("landing.tagline")}</p>
        <p className="text-balance text-muted-foreground">{t("landing.description")}</p>
        <Button size="lg" className="min-h-11 rounded-2xl px-8">
          {t("common.start")}
        </Button>
      </main>
    </div>
  );
}
