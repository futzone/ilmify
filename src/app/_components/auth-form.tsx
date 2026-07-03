"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, register } from "@/lib/pb/auth";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "register" && password !== passwordConfirm) {
      return setError(t("errors.passwordMismatch"));
    }
    setBusy(true);
    try {
      if (mode === "register") {
        await register({ email, password, passwordConfirm, name });
      } else {
        await login(email, password);
      }
      router.replace("/decks");
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (mode === "login" && status === 400) setError(t("errors.invalid"));
      else if (mode === "register" && status === 400) setError(t("errors.emailTaken"));
      else setError(t("errors.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{mode === "login" ? t("loginTitle") : t("registerTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            {mode === "register" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">{t("name")}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {mode === "register" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="pc">{t("passwordConfirm")}</Label>
                <Input id="pc" type="password" required value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} />
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={busy} className="min-h-11 rounded-2xl">
              {mode === "login" ? t("loginCta") : t("registerCta")}
            </Button>
            <Link
              href={mode === "login" ? "/register" : "/login"}
              className="text-center text-sm text-muted-foreground hover:text-foreground"
            >
              {mode === "login" ? t("toRegister") : t("toLogin")}
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
