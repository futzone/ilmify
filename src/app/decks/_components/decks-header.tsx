"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/components/auth/auth-provider";
import { logout } from "@/lib/pb/auth";

export function DecksHeader() {
  const t = useTranslations("auth");
  const { user } = useAuth();
  const router = useRouter();
  function onLogout() {
    logout();
    router.replace("/login");
  }
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{user?.email}</span>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Button variant="ghost" className="min-h-11" onClick={onLogout}>
          {t("logout")}
        </Button>
      </div>
    </div>
  );
}
