# Ilmify Backend & Auth (PocketBase) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ilmify deck ma'lumotlarini PocketBase (cloud, per-user) ga ko'chirish va email/parol autentifikatsiya qo'shish; Dexie/useLiveQuery ni PocketBase SDK + TanStack Query bilan almashtirish.

**Architecture:** PocketBase online-first (source of truth), per-user row-level rules. Client PB SDK (localStorage authStore). Server-state TanStack Query. Client-side AuthGuard himoyalangan sahifalar uchun. Notes/Cards keyingi milestone (M2).

**Tech Stack:** Next.js 16, React 19, TS strict, PocketBase (`pocketbase` JS SDK), `@tanstack/react-query`, next-intl, shadcn/Base-UI, Playwright (E2E), Vitest.

## Global Constraints

- Package manager: **pnpm**, bu sandbox'da `npx pnpm@latest ...`.
- TypeScript **strict: true**.
- **PocketBase URL:** `https://admin.imlogo.uz` (env: `NEXT_PUBLIC_POCKETBASE_URL`).
- **Mavjud kolleksiyalarga TEGILMAYDI** (`users`, `dictations`, `app`, `_*`). Faqat `ilmify_` prefiksli YANGI kolleksiyalar. Setup skript idempotent — mavjud bo'lsa yaratmaydi, hech narsani o'chirmaydi/o'zgartirmaydi.
- **Superadmin creds hech qachon commit qilinmaydi va bundle'ga tushmaydi.** Faqat `.env.local` (gitignore) + setup skript (`node --env-file=.env.local`). `NEXT_PUBLIC_` faqat PB URL uchun.
- **Row-level security:** har `ilmify_*` data kolleksiyasi `@request.auth.id != "" && owner = @request.auth.id` rules bilan.
- UI matni `messages/uz.json` dan; hard-code yo'q. Tap-target ≥44px.
- Base UI: `asChild` yo'q — `render` prop / `buttonVariants`.
- Har task oxirida commit; inglizcha `feat:`/`chore:`/`refactor:` prefiks.

---

### Task 1: PocketBase SDK + env + kolleksiya setup skripti

Kolleksiyalar jonli PocketBase'da yaratiladi. `.env.local` (superadmin creds bilan) **controller tomonidan allaqachon yaratilgan** — uni yaratmang/o'zgartirmang, faqat o'qing.

**Files:**
- Create: `scripts/pb-setup.mjs`, `.env.example`
- Modify: `package.json` (pocketbase dep), `.gitignore` (agar `.env.local` qamralmagan bo'lsa — lekin `.env*` allaqachon bor)

**Interfaces:**
- Produces: `ilmify_users` (auth) va `ilmify_decks` (base) kolleksiyalari PB'da; `pocketbase` SDK o'rnatilgan; `.env.example` hujjat.

- [ ] **Step 1: PocketBase SDK o'rnatish**

Run: `npx pnpm@latest add pocketbase`

- [ ] **Step 2: `.env.example` yozish**

Create `.env.example`:
```
# PocketBase (public — bundle'ga tushadi)
NEXT_PUBLIC_POCKETBASE_URL=https://admin.imlogo.uz

# Superadmin — FAQAT scripts/pb-setup.mjs uchun, hech qachon NEXT_PUBLIC_ emas
PB_URL=https://admin.imlogo.uz
PB_SUPERUSER_EMAIL=
PB_SUPERUSER_PASSWORD=
```
Confirm `.env.local` ildizda mavjud (controller yaratgan) va gitignore'da (`git check-ignore .env.local` `.env.local` chiqarishi kerak). Uni OCHMANG/o'zgartirmang; qiymatlar allaqachon to'ldirilgan.

- [ ] **Step 3: setup skript yozish (baseline)**

Create `scripts/pb-setup.mjs`:
```js
// Idempotent: creates ilmify_users (auth) + ilmify_decks (base). Never deletes/modifies existing.
// Run: node --env-file=.env.local scripts/pb-setup.mjs
const PB = process.env.PB_URL || process.env.NEXT_PUBLIC_POCKETBASE_URL;
const EMAIL = process.env.PB_SUPERUSER_EMAIL;
const PASSWORD = process.env.PB_SUPERUSER_PASSWORD;
if (!PB || !EMAIL || !PASSWORD) { console.error("Missing PB env"); process.exit(1); }

async function api(path, opts = {}, token) {
  const res = await fetch(`${PB}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: token } : {}), ...(opts.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} -> ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

const auth = await api("/api/collections/_superusers/auth-with-password", {
  method: "POST", body: JSON.stringify({ identity: EMAIL, password: PASSWORD }),
});
const token = auth.token;

const existing = await api("/api/collections?perPage=200", {}, token);
const byName = Object.fromEntries(existing.items.map((c) => [c.name, c]));

// 1. ilmify_users (auth)
if (!byName["ilmify_users"]) {
  await api("/api/collections", { method: "POST", body: JSON.stringify({
    name: "ilmify_users",
    type: "auth",
    fields: [{ name: "name", type: "text", required: false }],
    passwordAuth: { enabled: true, identityFields: ["email"] },
    createRule: "",                         // public registration
    listRule: "id = @request.auth.id",
    viewRule: "id = @request.auth.id",
    updateRule: "id = @request.auth.id",
    deleteRule: "id = @request.auth.id",
    authRule: "",                            // auto-confirm: auth allowed without verification
  }) }, token);
  console.log("created ilmify_users");
} else console.log("ilmify_users exists, skip");

const users = (await api("/api/collections?perPage=200", {}, token)).items.find((c) => c.name === "ilmify_users");

// 2. ilmify_decks (base)
if (!byName["ilmify_decks"]) {
  const OWNER_RULE = '@request.auth.id != "" && owner = @request.auth.id';
  await api("/api/collections", { method: "POST", body: JSON.stringify({
    name: "ilmify_decks",
    type: "base",
    fields: [
      { name: "name", type: "text", required: true, max: 60 },
      { name: "description", type: "text", required: false },
      { name: "color", type: "select", required: true, maxSelect: 1,
        values: ["purple","blue","green","amber","red","pink","teal","slate"] },
      { name: "owner", type: "relation", required: true, maxSelect: 1,
        collectionId: users.id, cascadeDelete: true },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    listRule: OWNER_RULE, viewRule: OWNER_RULE, createRule: OWNER_RULE,
    updateRule: OWNER_RULE, deleteRule: OWNER_RULE,
  }) }, token);
  console.log("created ilmify_decks");
} else console.log("ilmify_decks exists, skip");

console.log("done");
```

- [ ] **Step 4: skriptni ishga tushirish va jonli API'ga moslashtirish**

Run: `node --env-file=.env.local scripts/pb-setup.mjs`
Expected: "created ilmify_users", "created ilmify_decks", "done".
**Agar biror create 400 qaytarsa** (PB v0.23 field schema nomuvofiqligi): superadmin token bilan mavjud kolleksiyalarni tekshirib, aniq field formatini o'rganing va moslang:
```bash
# mavjud auth kolleksiya (users) field formatini ko'rish uchun
curl -s "$PB_URL/api/collections" -H "Authorization: <token>" | python3 -m json.tool | less
```
`users` (auth) va `dictations` (base) kolleksiyalarining `fields`/`passwordAuth`/`autodate` formatini ko'chirib, `ilmify_*` create body'sini shunga moslang. Skript idempotent — qayta ishga tushiring. **Hech qachon mavjud kolleksiyani PATCH/DELETE qilmang.**

- [ ] **Step 5: kolleksiyalar yaratilganini tasdiqlash**

Run:
```bash
curl -s "https://admin.imlogo.uz/api/collections?perPage=200" -H "Authorization: <token>" | python3 -c "import sys,json;print([c['name'] for c in json.load(sys.stdin)['items'] if c['name'].startswith('ilmify')])"
```
Expected: `['ilmify_users', 'ilmify_decks']`.

- [ ] **Step 6: Commit**

```bash
git add scripts/pb-setup.mjs .env.example package.json pnpm-lock.yaml
git commit -m "chore: add PocketBase SDK and collection setup script"
```
(`.env.local` gitignore'da — commit qilinmaydi. Tasdiqlang: `git status` `.env.local` ni ko'rsatmaydi.)

---

### Task 2: PB client + deck-types migratsiya + Dexie olib tashlash

**Files:**
- Create: `src/lib/pb/client.ts`, `src/lib/deck-types.ts`, `src/lib/deck-types.test.ts`
- Delete: `src/lib/db/db.ts`, `src/lib/db/decks.ts`, `src/lib/db/decks.test.ts`, `src/lib/db/types.ts`, `src/lib/db/types.test.ts`
- Modify: `package.json` (dexie/dexie-react-hooks/fake-indexeddb olib tashlash)
- Keep: `src/lib/deck-colors.ts` (o'zgarishsiz, importlari `deck-types` ga)

**Interfaces:**
- Consumes: `pocketbase` SDK.
- Produces: `pb` (PocketBase singleton), `Deck`, `DeckColor`, `DECK_COLORS`, `DeckInput`, `deckInputSchema`, `mapRecordToDeck(record): Deck`.

- [ ] **Step 1: PB client**

Create `src/lib/pb/client.ts`:
```ts
import PocketBase from "pocketbase";

const url = process.env.NEXT_PUBLIC_POCKETBASE_URL;
if (!url) throw new Error("NEXT_PUBLIC_POCKETBASE_URL is not set");

export const pb = new PocketBase(url);
pb.autoCancellation(false); // TanStack Query bir nechta so'rovni parallel yuborishi mumkin
```

- [ ] **Step 2: deck-types + mapping (failing test)**

Create `src/lib/deck-types.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { deckInputSchema, DECK_COLORS, mapRecordToDeck } from "@/lib/deck-types";

describe("deckInputSchema", () => {
  it("accepts valid input and trims name", () => {
    expect(deckInputSchema.parse({ name: "  A  ", color: "purple" }).name).toBe("A");
  });
  it("rejects empty name", () => {
    expect(() => deckInputSchema.parse({ name: " ", color: "blue" })).toThrow();
  });
  it("rejects name > 60", () => {
    expect(() => deckInputSchema.parse({ name: "x".repeat(61), color: "blue" })).toThrow();
  });
  it("rejects unknown color", () => {
    expect(() => deckInputSchema.parse({ name: "A", color: "gold" })).toThrow();
  });
});

describe("mapRecordToDeck", () => {
  it("maps a PB record to a Deck", () => {
    const deck = mapRecordToDeck({
      id: "abc123", name: "Ingliz", description: "", color: "purple",
      owner: "u1", created: "2026-07-03 10:00:00.000Z", updated: "2026-07-03 10:00:00.000Z",
      collectionId: "x", collectionName: "ilmify_decks",
    });
    expect(deck).toEqual({
      id: "abc123", name: "Ingliz", description: "", color: "purple",
      owner: "u1", created: "2026-07-03 10:00:00.000Z", updated: "2026-07-03 10:00:00.000Z",
    });
  });
});
```

- [ ] **Step 3: test fail'ini ko'rish**

Run: `npx pnpm@latest test src/lib/deck-types.test.ts`
Expected: FAIL — modul yo'q.

- [ ] **Step 4: deck-types.ts**

Create `src/lib/deck-types.ts`:
```ts
import { z } from "zod";
import type { RecordModel } from "pocketbase";

export const DECK_COLORS = [
  "purple", "blue", "green", "amber", "red", "pink", "teal", "slate",
] as const;
export type DeckColor = (typeof DECK_COLORS)[number];

export type Deck = {
  id: string;
  name: string;
  description: string;
  color: DeckColor;
  owner: string;
  created: string;
  updated: string;
};

export const deckInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(500).optional(),
  color: z.enum(DECK_COLORS),
});
export type DeckInput = z.infer<typeof deckInputSchema>;

export function mapRecordToDeck(record: RecordModel): Deck {
  return {
    id: record.id,
    name: record.name,
    description: record.description ?? "",
    color: record.color,
    owner: record.owner,
    created: record.created,
    updated: record.updated,
  };
}
```

- [ ] **Step 5: deck-colors import yangilash**

`src/lib/deck-colors.ts` — `import type { DeckColor } from "@/lib/db/types"` ni `"@/lib/deck-types"` ga o'zgartiring.

- [ ] **Step 6: Dexie fayllarini o'chirish + dep olib tashlash**

Run:
```bash
rm -f src/lib/db/db.ts src/lib/db/decks.ts src/lib/db/decks.test.ts src/lib/db/types.ts src/lib/db/types.test.ts
rmdir src/lib/db 2>/dev/null || true
npx pnpm@latest remove dexie dexie-react-hooks fake-indexeddb
```
(Eslatma: bu deck UI komponentlarini vaqtincha buzadi — ular Task 6'da ko'chiriladi. Bu task oxirida `pnpm build` HALI o'tmasligi mumkin; test o'tishi kifoya. Agar build'ni yashil ushlamoqchi bo'lsangiz, bu task'ni Task 6 bilan birga bajaring — lekin reja ularni alohida ushlaydi, shuning uchun bu task uchun faqat `test` yashil talab qilinadi.)

- [ ] **Step 7: test yashil**

Run: `npx pnpm@latest test src/lib/deck-types.test.ts`
Expected: PASS (5 test).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: replace Dexie deck types with PocketBase deck-types and mapping"
```

---

### Task 3: Auth wrappers + AuthProvider + AuthGuard

**Files:**
- Create: `src/lib/pb/auth.ts`, `src/components/auth/auth-provider.tsx`, `src/components/auth/auth-guard.tsx`

**Interfaces:**
- Consumes: `pb` (Task 2).
- Produces:
  - `auth.ts`: `register(input)`, `login(email, password)`, `logout()`, `getCurrentUser()`.
  - `useAuth()` hook → `{ user: AuthUser | null, isLoading: boolean }`.
  - `<AuthProvider>`, `<AuthGuard>`.

- [ ] **Step 1: auth.ts**

Create `src/lib/pb/auth.ts`:
```ts
import { pb } from "@/lib/pb/client";

export type AuthUser = { id: string; email: string; name: string };

export async function register(input: {
  email: string; password: string; passwordConfirm: string; name?: string;
}): Promise<void> {
  await pb.collection("ilmify_users").create({
    email: input.email,
    password: input.password,
    passwordConfirm: input.passwordConfirm,
    name: input.name ?? "",
  });
  await login(input.email, input.password);
}

export async function login(email: string, password: string): Promise<void> {
  await pb.collection("ilmify_users").authWithPassword(email, password);
}

export function logout(): void {
  pb.authStore.clear();
}

export function getCurrentUser(): AuthUser | null {
  const m = pb.authStore.record;
  if (!m) return null;
  return { id: m.id, email: m.email, name: m.name ?? "" };
}
```

- [ ] **Step 2: AuthProvider**

Create `src/components/auth/auth-provider.tsx`:
```tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { pb } from "@/lib/pb/client";
import { getCurrentUser, type AuthUser } from "@/lib/pb/auth";

type AuthState = { user: AuthUser | null; isLoading: boolean };
const AuthContext = createContext<AuthState>({ user: null, isLoading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUser(getCurrentUser());
    setIsLoading(false);
    const unsub = pb.authStore.onChange(() => setUser(getCurrentUser()));
    return () => unsub();
  }, []);

  return <AuthContext.Provider value={{ user, isLoading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 3: AuthGuard**

Create `src/components/auth/auth-guard.tsx`:
```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./auth-provider";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return <div className="flex min-h-dvh items-center justify-center text-muted-foreground">…</div>;
  }
  return <>{children}</>;
}
```

- [ ] **Step 4: build tasdig'i**

Run: `npx pnpm@latest build`
Expected: xatosiz kompilyatsiya (bu fayllar mustaqil; deck UI hali Task 6'da tuzatiladi — agar build deck UI tufayli fail bo'lsa, bu KUTILGAN, faqat bu 3 yangi fayl kompilyatsiya bo'lishini `tsc` bilan tekshiring: `npx pnpm@latest exec tsc --noEmit` deck UI xatolaridan tashqari yangi fayllarda xato bo'lmasligi kerak).

- [ ] **Step 5: Commit**

```bash
git add src/lib/pb/auth.ts src/components/auth
git commit -m "feat: add PocketBase auth wrappers, provider and guard"
```

---

### Task 4: Auth sahifalari (/login, /register) + i18n

**Files:**
- Create: `src/app/login/page.tsx`, `src/app/register/page.tsx`, `src/app/_components/auth-form.tsx`
- Modify: `messages/uz.json` (`auth` namespace)

**Interfaces:**
- Consumes: `login`, `register` (Task 3); shadcn `Input`, `Label`, `Button`, `Card`.
- Produces: ishlaydigan login/register sahifalari.

- [ ] **Step 1: i18n matnlari**

`messages/uz.json` ga top-level `auth` qo'shing:
```json
"auth": {
  "loginTitle": "Kirish",
  "registerTitle": "Ro'yxatdan o'tish",
  "email": "Email",
  "password": "Parol",
  "passwordConfirm": "Parolni tasdiqlang",
  "name": "Ism",
  "loginCta": "Kirish",
  "registerCta": "Ro'yxatdan o'tish",
  "toRegister": "Hisobingiz yo'qmi? Ro'yxatdan o'ting",
  "toLogin": "Hisobingiz bormi? Kiring",
  "logout": "Chiqish",
  "errors": {
    "invalid": "Email yoki parol noto'g'ri",
    "emailTaken": "Bu email allaqachon band",
    "passwordMismatch": "Parollar mos kelmadi",
    "failed": "Xatolik yuz berdi. Qaytadan urinib ko'ring."
  }
}
```

- [ ] **Step 2: AuthForm (create+login umumiy)**

Create `src/app/_components/auth-form.tsx`:
```tsx
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
```

- [ ] **Step 3: sahifalar**

Create `src/app/login/page.tsx`:
```tsx
import { AuthForm } from "@/app/_components/auth-form";
export default function LoginPage() {
  return <AuthForm mode="login" />;
}
```
Create `src/app/register/page.tsx`:
```tsx
import { AuthForm } from "@/app/_components/auth-form";
export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
```

- [ ] **Step 4: build tasdig'i (tsc)**

Run: `npx pnpm@latest exec tsc --noEmit`
Expected: yangi auth fayllarda xato yo'q (deck UI xatolari Task 6'gacha kutilgan).

- [ ] **Step 5: Commit**

```bash
git add src/app/login src/app/register src/app/_components/auth-form.tsx messages/uz.json
git commit -m "feat: add login and register pages"
```

---

### Task 5: Deck repository (PB) + TanStack Query + provider

**Files:**
- Create: `src/lib/pb/decks.ts`, `src/lib/pb/deck-queries.ts`, `src/components/query-provider.tsx`
- Modify: `src/app/layout.tsx` (QueryProvider + AuthProvider o'rash)

**Interfaces:**
- Consumes: `pb` (Task 2), `Deck`/`DeckInput`/`mapRecordToDeck` (Task 2), `AuthProvider` (Task 3).
- Produces:
  - `decks.ts`: `listDecks()`, `createDeck(input)`, `updateDeck(id, input)`, `deleteDeck(id)` (owner = auth id).
  - `deck-queries.ts`: `useDecks()`, `useCreateDeck()`, `useUpdateDeck()`, `useDeleteDeck()`.

- [ ] **Step 1: TanStack Query o'rnatish**

Run: `npx pnpm@latest add @tanstack/react-query`

- [ ] **Step 2: PB deck repository**

Create `src/lib/pb/decks.ts`:
```ts
import { pb } from "@/lib/pb/client";
import { type Deck, type DeckInput, deckInputSchema, mapRecordToDeck } from "@/lib/deck-types";

const COL = "ilmify_decks";

export async function listDecks(): Promise<Deck[]> {
  const records = await pb.collection(COL).getFullList({ sort: "-updated" });
  return records.map(mapRecordToDeck);
}

export async function createDeck(input: DeckInput): Promise<Deck> {
  const parsed = deckInputSchema.parse(input);
  const owner = pb.authStore.record?.id;
  if (!owner) throw new Error("Not authenticated");
  const record = await pb.collection(COL).create({
    name: parsed.name, description: parsed.description ?? "", color: parsed.color, owner,
  });
  return mapRecordToDeck(record);
}

export async function updateDeck(id: string, input: DeckInput): Promise<Deck> {
  const parsed = deckInputSchema.parse(input);
  const record = await pb.collection(COL).update(id, {
    name: parsed.name, description: parsed.description ?? "", color: parsed.color,
  });
  return mapRecordToDeck(record);
}

export async function deleteDeck(id: string): Promise<void> {
  await pb.collection(COL).delete(id);
}
```

- [ ] **Step 3: TanStack Query hooks**

Create `src/lib/pb/deck-queries.ts`:
```ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createDeck, deleteDeck, listDecks, updateDeck } from "@/lib/pb/decks";
import type { DeckInput } from "@/lib/deck-types";

const KEY = ["decks"];

export function useDecks() {
  return useQuery({ queryKey: KEY, queryFn: listDecks });
}

export function useCreateDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DeckInput) => createDeck(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DeckInput }) => updateDeck(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDeck(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
```

- [ ] **Step 4: QueryProvider**

Create `src/components/query-provider.tsx`:
```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 5: layout.tsx ga providerlar**

`src/app/layout.tsx` — `QueryProvider` va `AuthProvider` ni `NextIntlClientProvider`/`ThemeProvider` ichida o'rang. Tartib: NextIntl > Theme > Query > Auth > children. Mavjud font/lang/suppressHydrationWarning saqlanadi.
```tsx
import { QueryProvider } from "@/components/query-provider";
import { AuthProvider } from "@/components/auth/auth-provider";
// ... <NextIntlClientProvider><ThemeProvider ...><QueryProvider><AuthProvider>{children}</AuthProvider></QueryProvider></ThemeProvider></NextIntlClientProvider>
```

- [ ] **Step 6: build (tsc)**

Run: `npx pnpm@latest exec tsc --noEmit`
Expected: yangi fayllarda xato yo'q (deck UI hali Task 6'da).

- [ ] **Step 7: Commit**

```bash
git add src/lib/pb/decks.ts src/lib/pb/deck-queries.ts src/components/query-provider.tsx src/app/layout.tsx
git commit -m "feat: add PocketBase deck repository and TanStack Query hooks"
```

---

### Task 6: Deck UI ni TanStack Query ga ko'chirish + AuthGuard + header

**Files:**
- Modify: `src/app/decks/_components/deck-list.tsx`, `deck-card.tsx`, `decks-client.tsx`, `deck-form-dialog.tsx`, `delete-deck-dialog.tsx`, `src/app/decks/page.tsx`, `src/app/page.tsx`
- Create: `src/app/decks/_components/decks-header.tsx` (foydalanuvchi + chiqish)

**Interfaces:**
- Consumes: `useDecks`/`useCreateDeck`/`useUpdateDeck`/`useDeleteDeck` (Task 5), `AuthGuard`/`useAuth`/`logout` (Task 3), `Deck`/`DeckInput` (Task 2).

- [ ] **Step 1: DeckList — useDecks**

`deck-list.tsx` — `useLiveQuery(() => listDecks())` ni `const { data: decks, isLoading, error } = useDecks();` bilan almashtiring. `isLoading` → skeleton; `error` → xato holati (`t("errors.loadFailed")` yoki yangi kalit); `data?.length === 0` → empty; aks holda grid. `Deck` importi `@/lib/deck-types` dan. `listDecks`/`dexie-react-hooks` importlarini olib tashlang.

- [ ] **Step 2: deck-card — `Deck` importi**

`deck-card.tsx` — `import type { Deck } from "@/lib/deck-types"`. Boshqa o'zgarish yo'q (props bir xil).

- [ ] **Step 3: DecksClient — mutation hooks**

`decks-client.tsx` — `createDeck`/`updateDeck`/`deleteDeck` to'g'ridan chaqiruvlarini mutation hook'lariga almashtiring:
```tsx
const createM = useCreateDeck();
const updateM = useUpdateDeck();
const deleteM = useDeleteDeck();
async function handleSubmit(input: DeckInput) {
  if (editing) await updateM.mutateAsync({ id: editing.id, input });
  else await createM.mutateAsync(input);
}
async function handleDelete() {
  if (deleting) await deleteM.mutateAsync(deleting.id);
  setDeleting(null);
}
```
`Deck`/`DeckInput` importlari `@/lib/deck-types` dan.

- [ ] **Step 4: deck-form-dialog / delete-deck-dialog — importlar**

Ikkalasida `Deck`/`DeckInput`/`DECK_COLORS`/`DeckColor` importlarini `@/lib/deck-types` ga yo'naltiring. Mantiq o'zgarmaydi.

- [ ] **Step 5: DecksHeader + AuthGuard**

Create `src/app/decks/_components/decks-header.tsx`:
```tsx
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
        <Button variant="ghost" className="min-h-11" onClick={onLogout}>{t("logout")}</Button>
      </div>
    </div>
  );
}
```
`src/app/decks/page.tsx` — `AuthGuard` bilan o'rang va `DecksHeader` qo' shing:
```tsx
import { AuthGuard } from "@/components/auth/auth-guard";
import { DecksHeader } from "./_components/decks-header";
import { DecksClient } from "./_components/decks-client";

export default function DecksPage() {
  return (
    <AuthGuard>
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-6 px-6 py-6">
        <DecksHeader />
        <DecksClient />
      </div>
    </AuthGuard>
  );
}
```

- [ ] **Step 6: build tasdig'i (to'liq)**

Run: `npx pnpm@latest build`
Expected: xatosiz (endi barcha deck UI ko'chirilgan; Dexie importlari qolmagan). Agar `NEXT_PUBLIC_POCKETBASE_URL` build vaqtida kerak bo'lsa, u `.env.local` da mavjud.
Run: `npx pnpm@latest test` — unit-testlar (deck-types) yashil.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: migrate deck UI to TanStack Query with auth guard and header"
```

---

### Task 7: E2E tasdiqlash + yakuniy tozalash

**Files:**
- Create: `e2e/auth-decks.spec.ts` (Playwright), `playwright.config.ts` (agar yo'q bo'lsa)
- Modify: `package.json` (`@playwright/test` dev dep, `test:e2e` skript), `.gitignore` (`test-results/`, `playwright-report/`)

**Interfaces:**
- Consumes: to'liq ishlaydigan ilova + jonli PocketBase.

- [ ] **Step 1: Playwright o'rnatish**

Run: `npx pnpm@latest add -D @playwright/test` (brauzer allaqachon sandbox'da mavjud — MCP Playwright ishlagan; agar E2E runner brauzer topa olmasa, `npx playwright install chromium`).

- [ ] **Step 2: playwright config**

Create `playwright.config.ts`:
```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "npx pnpm@latest dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

- [ ] **Step 3: E2E test**

Create `e2e/auth-decks.spec.ts`:
```ts
import { expect, test } from "@playwright/test";

test("register, create/edit/delete deck, logout, login", async ({ page }) => {
  const email = `test${Date.now()}@ilmify.test`;
  const password = "Passw0rd!123";

  // register
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Parol", { exact: true }).fill(password);
  await page.getByLabel("Parolni tasdiqlang").fill(password);
  await page.getByRole("button", { name: "Ro'yxatdan o'tish" }).click();
  await expect(page).toHaveURL(/\/decks/);

  // empty state
  await expect(page.getByRole("heading", { name: "Hali deck yo'q" })).toBeVisible();

  // create
  await page.getByRole("button", { name: "Yangi deck" }).click();
  await page.getByLabel("Nom").fill("E2E Deck");
  await page.getByRole("button", { name: "Yaratish" }).click();
  await expect(page.getByText("E2E Deck")).toBeVisible();

  // logout
  await page.getByRole("button", { name: "Chiqish" }).click();
  await expect(page).toHaveURL(/\/login/);

  // login again — deck persists (server-side)
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Parol", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Kirish" }).click();
  await expect(page).toHaveURL(/\/decks/);
  await expect(page.getByText("E2E Deck")).toBeVisible();

  // guard: logout then hitting /decks redirects to /login
  await page.getByRole("button", { name: "Chiqish" }).click();
  await page.goto("/decks");
  await expect(page).toHaveURL(/\/login/);
});
```

- [ ] **Step 4: E2E ishga tushirish**

Run: `npx pnpm@latest exec playwright test`
Expected: 1 passed. (Dev server avtomatik ko'tariladi; `.env.local` env'ni beradi.)
Agar `getByLabel` mos kelmasa (Base UI label bog'lanishi), selektorlarni haqiqiy DOM'ga moslang (test faylni jonli sahifaga qarab tuzating).

- [ ] **Step 5: gitignore + skript**

`.gitignore` ga `test-results/`, `playwright-report/`, `/e2e/.auth` qo'shing. `package.json` scripts ga `"test:e2e": "playwright test"`.

- [ ] **Step 6: yakuniy build + unit test**

Run: `npx pnpm@latest build && npx pnpm@latest test`
Expected: build xatosiz; unit-testlar yashil.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "test: add Playwright e2e for auth and deck CRUD"
```

---

## Self-Review

**Spec coverage (2026-07-03-ilmify-backend-auth-design.md):**
- §3 kolleksiyalar (ilmify_users, ilmify_decks, rules) → Task 1. ✅
- §4 client/auth/pages/query/header → Task 2 (client), 3 (auth infra), 4 (pages), 5 (query), 6 (header). ✅
- §5 Deck model (owner, ISO created/updated) → Task 2. ✅
- §6 Dexie olib tashlash → Task 2 (delete files/deps), Task 6 (UI migratsiya). ✅
- §7 xatolar (auth invalid, network, guard redirect) → Task 4 (auth errors), Task 6 (query error state), Task 3 (guard). ✅
- §8 test (zod, mapping unit + E2E) → Task 2 (unit), Task 7 (E2E). ✅
- §9 env → Task 1 (.env.example, .env.local ishlatish). ✅
- §11 DoD 1-8 → tasklararo. ✅

**Placeholder scan:** Kod to'liq. PB v0.23 schema uchun "jonli API'ga moslang" ko'rsatmasi real (versiya farqi mumkin). `<token>` placeholderlari qo'lda-tekshiruv buyruqlarida (skript avtomatik oladi). ✅

**Type consistency:** `Deck` (id/name/description/color/owner/created/updated), `DeckInput`, `mapRecordToDeck`, `listDecks/createDeck/updateDeck/deleteDeck`, `useDecks/useCreateDeck/useUpdateDeck/useDeleteDeck`, `register/login/logout/getCurrentUser`, `useAuth`, `AuthProvider/AuthGuard` — tasklararo izchil. Deck UI props (M1'dan) o'zgarmaydi, faqat data manbai. ✅

**Xavfsizlik tekshiruvi:** `.env.local` gitignore'da (`.env*`), Task 1 Step 6 commit'ida `.env.local` yo'qligini tasdiqlaydi. Superadmin creds faqat setup skriptida (`node --env-file`), hech qaysi subagent prompt'ida yoki commit'da emas. ✅

**Controller eslatmasi (SDD ijrosidan oldin):** `.env.local` ni (NEXT_PUBLIC_POCKETBASE_URL + PB_URL + PB_SUPERUSER_EMAIL/PASSWORD bilan) controller yaratadi, subagent prompt'iga creds joylanmaydi.
