import { getTranslations } from "next-intl/server";
import { ThemeToggle } from "@/components/theme-toggle";

export async function SiteHeader() {
  const t = await getTranslations("common");
  return (
    <header className="flex items-center justify-between px-6 py-4">
      <span className="text-xl font-bold text-brand">{t("appName")}</span>
      <ThemeToggle />
    </header>
  );
}
