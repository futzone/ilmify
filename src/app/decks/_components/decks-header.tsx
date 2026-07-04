"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/components/auth/auth-provider";
import { logout } from "@/lib/pb/auth";

export function DecksHeader() {
  const t = useTranslations("auth");
  const tNav = useTranslations("nav");
  const { user } = useAuth();
  const router = useRouter();
  function onLogout() {
    logout();
    router.replace("/login");
  }
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/decks" className="font-medium hover:text-brand">
            {tNav("decks")}
          </Link>
          <Link href="/analytics" className="text-muted-foreground hover:text-brand">
            {tNav("analytics")}
          </Link>
        </nav>
        <span className="hidden text-sm text-muted-foreground sm:inline">{user?.email}</span>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Button variant="ghost" className="min-h-11" onClick={onLogout}>
          {t("logout")}
        </Button>
      </div>
    </div>
  );
}
