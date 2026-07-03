# Ilmify M1′ (Local Data Layer + Deck CRUD) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Brauzerda (IndexedDB/Dexie) yashaydigan deck'lar va ular ustidan to'liq CRUD (yaratish/ro'yxat/tahrirlash/o'chirish), jonli yangilanadigan `/decks` sahifasi bilan.

**Architecture:** Dexie DB (`decks` jadvali) + sof repository funksiyalari (`src/lib/db/`), zod bilan validatsiya, `fake-indexeddb` bilan TDD. UI `dexie-react-hooks`'ning `useLiveQuery` orqali reaktiv; barcha DB kirish faqat client komponentlarda. Deck'lar tekis (flat); `parentId` schema'da bor lekin har doim `null`.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Tailwind v4, shadcn/ui (Base UI primitivlar), next-intl, Dexie, dexie-react-hooks, zod, Vitest + fake-indexeddb.

## Global Constraints

- Package manager: **pnpm**, bu sandbox'da `npx pnpm@latest ...` orqali.
- TypeScript **strict: true**.
- **Dexie faqat brauzerda ishlaydi** (IndexedDB). `src/lib/db/*` ni **hech qachon server komponentdan import qilmang** — faqat `"use client"` komponentlar va testlar import qiladi. `/decks/page.tsx` server komponent bo'lib qoladi va DB'ni import qilmaydi; u client `<DecksClient/>` ni render qiladi.
- Barcha UI matni **`messages/uz.json`** dan (`decks` namespace); hard-code yo'q.
- Bosiladigan elementlar **≥ 44px** (`min-h-11` / `size-11`).
- shadcn Base UI primitivlar **`asChild`ni qo'llamaydi** — link-tugma uchun `buttonVariants` + `<Link>` ishlating; menyu trigger uchun `render` prop.
- `crypto.randomUUID()` ID uchun (Node 20+ va brauzerda global mavjud).
- Har task oxirida commit; xabar inglizcha `feat:`/`test:`/`chore:` prefiksi bilan.

---

### Task 1: Deck tiplari, ranglar va zod validatsiya

**Files:**
- Create: `src/lib/db/types.ts`
- Create: `src/lib/deck-colors.ts`
- Test: `src/lib/db/types.test.ts`

**Interfaces:**
- Produces:
  - `type Deck = { id: string; name: string; description: string; color: DeckColor; parentId: string | null; createdAt: number; updatedAt: number }`
  - `const DECK_COLORS = ["purple","blue","green","amber","red","pink","teal","slate"] as const`
  - `type DeckColor = (typeof DECK_COLORS)[number]`
  - `const deckInputSchema` (zod) and `type DeckInput = z.infer<typeof deckInputSchema>`
  - `const deckColorClasses: Record<DeckColor, string>` (Tailwind bg klasslari)

- [ ] **Step 1: zod o'rnatish**

Run: `npx pnpm@latest add zod`
Expected: `zod` `package.json` dependencies'ga qo'shiladi.

- [ ] **Step 2: Failing test yozish**

Create `src/lib/db/types.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { deckInputSchema, DECK_COLORS } from "@/lib/db/types";

describe("deckInputSchema", () => {
  it("accepts a valid input", () => {
    const parsed = deckInputSchema.parse({ name: "Ingliz", description: "Unit 1", color: "purple" });
    expect(parsed.name).toBe("Ingliz");
    expect(parsed.color).toBe("purple");
  });
  it("trims the name", () => {
    expect(deckInputSchema.parse({ name: "  Ingliz  ", color: "blue" }).name).toBe("Ingliz");
  });
  it("rejects an empty name", () => {
    expect(() => deckInputSchema.parse({ name: "   ", color: "blue" })).toThrow();
  });
  it("rejects a name longer than 60 chars", () => {
    expect(() => deckInputSchema.parse({ name: "x".repeat(61), color: "blue" })).toThrow();
  });
  it("rejects an unknown color", () => {
    expect(() => deckInputSchema.parse({ name: "Ok", color: "gold" })).toThrow();
  });
  it("exposes 8 colors", () => {
    expect(DECK_COLORS).toHaveLength(8);
  });
});
```

- [ ] **Step 3: Test'ni ishga tushirib fail'ni ko'rish**

Run: `npx pnpm@latest test src/lib/db/types.test.ts`
Expected: FAIL — `@/lib/db/types` topilmaydi.

- [ ] **Step 4: types.ts yozish**

Create `src/lib/db/types.ts`:
```ts
import { z } from "zod";

export const DECK_COLORS = [
  "purple",
  "blue",
  "green",
  "amber",
  "red",
  "pink",
  "teal",
  "slate",
] as const;

export type DeckColor = (typeof DECK_COLORS)[number];

export type Deck = {
  id: string;
  name: string;
  description: string;
  color: DeckColor;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
};

export const deckInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(500).optional(),
  color: z.enum(DECK_COLORS),
});

export type DeckInput = z.infer<typeof deckInputSchema>;
```
(Agar o'rnatilgan zod versiyasida `z.enum(DECK_COLORS)` readonly tuple bilan tip xatosi bersa, `z.enum([...DECK_COLORS])` ishlating.)

- [ ] **Step 5: deck-colors.ts yozish**

Create `src/lib/deck-colors.ts`:
```ts
import type { DeckColor } from "@/lib/db/types";

// Rang belgisi (dot / swatch) uchun Tailwind bg klasslari — light/dark'da mos.
export const deckColorClasses: Record<DeckColor, string> = {
  purple: "bg-violet-500",
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  pink: "bg-pink-500",
  teal: "bg-teal-500",
  slate: "bg-slate-500",
};
```

- [ ] **Step 6: Testlar o'tishini tekshirish**

Run: `npx pnpm@latest test src/lib/db/types.test.ts`
Expected: PASS (6 test).

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/types.ts src/lib/deck-colors.ts src/lib/db/types.test.ts package.json pnpm-lock.yaml
git commit -m "feat: add deck types, colors and zod validation"
```

---

### Task 2: Dexie DB + deck repository (TDD)

**Files:**
- Create: `src/lib/db/db.ts`
- Create: `src/lib/db/decks.ts`
- Test: `src/lib/db/decks.test.ts`

**Interfaces:**
- Consumes: `Deck`, `DeckInput`, `deckInputSchema` (Task 1).
- Produces (repository):
  - `createDeck(input: DeckInput): Promise<Deck>`
  - `listDecks(): Promise<Deck[]>` — `updatedAt` desc
  - `getDeck(id: string): Promise<Deck | undefined>`
  - `updateDeck(id: string, input: DeckInput): Promise<Deck>` — mavjud emas bo'lsa throw
  - `deleteDeck(id: string): Promise<void>` — idempotent
  - `db` (Dexie instance, `db.decks` jadvali)

- [ ] **Step 1: Dexie + fake-indexeddb o'rnatish**

Run: `npx pnpm@latest add dexie && npx pnpm@latest add -D fake-indexeddb`

- [ ] **Step 2: db.ts yozish**

Create `src/lib/db/db.ts`:
```ts
import Dexie, { type EntityTable } from "dexie";
import type { Deck } from "@/lib/db/types";

const db = new Dexie("ilmify") as Dexie & {
  decks: EntityTable<Deck, "id">;
};

// version 1: decks jadvali. Primary key = id; indekslar: updatedAt (tartib), parentId (kelajak).
db.version(1).stores({
  decks: "id, updatedAt, parentId",
});

export { db };
```

- [ ] **Step 3: Failing test yozish**

Create `src/lib/db/decks.test.ts`:
```ts
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db/db";
import { createDeck, deleteDeck, getDeck, listDecks, updateDeck } from "@/lib/db/decks";

beforeEach(async () => {
  await db.decks.clear();
});

describe("deck repository", () => {
  it("createDeck fills id and timestamps, parentId null", async () => {
    const deck = await createDeck({ name: "Ingliz", color: "purple" });
    expect(deck.id).toMatch(/[0-9a-f-]{36}/);
    expect(deck.name).toBe("Ingliz");
    expect(deck.description).toBe("");
    expect(deck.parentId).toBeNull();
    expect(deck.createdAt).toBeGreaterThan(0);
    expect(deck.updatedAt).toBe(deck.createdAt);
  });

  it("created deck appears in listDecks", async () => {
    const deck = await createDeck({ name: "Ingliz", color: "purple" });
    const all = await listDecks();
    expect(all.map((d) => d.id)).toContain(deck.id);
  });

  it("listDecks orders by updatedAt desc", async () => {
    const a = await createDeck({ name: "A", color: "blue" });
    const b = await createDeck({ name: "B", color: "green" });
    await updateDeck(a.id, { name: "A2", color: "blue" }); // a endi eng yangi
    const ids = (await listDecks()).map((d) => d.id);
    expect(ids[0]).toBe(a.id);
    expect(ids[1]).toBe(b.id);
  });

  it("updateDeck changes fields and updatedAt but not createdAt", async () => {
    const deck = await createDeck({ name: "Old", color: "red" });
    const updated = await updateDeck(deck.id, { name: "New", description: "d", color: "teal" });
    expect(updated.name).toBe("New");
    expect(updated.description).toBe("d");
    expect(updated.color).toBe("teal");
    expect(updated.createdAt).toBe(deck.createdAt);
    expect(updated.updatedAt).toBeGreaterThanOrEqual(deck.updatedAt);
  });

  it("updateDeck throws for a missing id", async () => {
    await expect(updateDeck("nope", { name: "X", color: "blue" })).rejects.toThrow();
  });

  it("deleteDeck removes the deck and is idempotent", async () => {
    const deck = await createDeck({ name: "Bye", color: "amber" });
    await deleteDeck(deck.id);
    expect(await getDeck(deck.id)).toBeUndefined();
    await expect(deleteDeck(deck.id)).resolves.toBeUndefined(); // idempotent
  });

  it("createDeck rejects invalid input", async () => {
    await expect(createDeck({ name: "  ", color: "purple" })).rejects.toThrow();
  });
});
```

- [ ] **Step 4: Test'ni ishga tushirib fail'ni ko'rish**

Run: `npx pnpm@latest test src/lib/db/decks.test.ts`
Expected: FAIL — `@/lib/db/decks` topilmaydi.

- [ ] **Step 5: decks.ts yozish**

Create `src/lib/db/decks.ts`:
```ts
import { db } from "@/lib/db/db";
import { type Deck, type DeckInput, deckInputSchema } from "@/lib/db/types";

export async function createDeck(input: DeckInput): Promise<Deck> {
  const parsed = deckInputSchema.parse(input);
  const now = Date.now();
  const deck: Deck = {
    id: crypto.randomUUID(),
    name: parsed.name,
    description: parsed.description ?? "",
    color: parsed.color,
    parentId: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.decks.add(deck);
  return deck;
}

export async function listDecks(): Promise<Deck[]> {
  return db.decks.orderBy("updatedAt").reverse().toArray();
}

export async function getDeck(id: string): Promise<Deck | undefined> {
  return db.decks.get(id);
}

export async function updateDeck(id: string, input: DeckInput): Promise<Deck> {
  const parsed = deckInputSchema.parse(input);
  const existing = await db.decks.get(id);
  if (!existing) throw new Error(`Deck not found: ${id}`);
  const updated: Deck = {
    ...existing,
    name: parsed.name,
    description: parsed.description ?? "",
    color: parsed.color,
    updatedAt: Date.now(),
  };
  await db.decks.put(updated);
  return updated;
}

export async function deleteDeck(id: string): Promise<void> {
  await db.decks.delete(id);
}
```

- [ ] **Step 6: Testlar o'tishini tekshirish**

Run: `npx pnpm@latest test src/lib/db/decks.test.ts`
Expected: PASS (7 test).
(Eslatma: `listDecks orders by updatedAt desc` testi bir xil millisekundda flaky bo'lmasligi uchun `updateDeck` `a` ni oxirgi qilib yozadi — agar `Date.now()` bir xil qiymat qaytarib flaky bo'lsa, `updateDeck` da `updatedAt: Math.max(Date.now(), existing.updatedAt + 1)` ishlating.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/db.ts src/lib/db/decks.ts src/lib/db/decks.test.ts package.json pnpm-lock.yaml
git commit -m "feat: add Dexie db and deck repository with tests"
```

---

### Task 3: shadcn UI primitivlari + i18n matnlari

**Files:**
- Create: `src/components/ui/dialog.tsx`, `src/components/ui/alert-dialog.tsx`, `src/components/ui/input.tsx`, `src/components/ui/textarea.tsx`, `src/components/ui/label.tsx` (shadcn generatsiya qiladi)
- Modify: `messages/uz.json` (`decks` namespace qo'shish)

**Interfaces:**
- Produces: shadcn `Dialog*`, `AlertDialog*`, `Input`, `Textarea`, `Label` komponentlari; `decks.*` tarjima kalitlari.

- [ ] **Step 1: shadcn komponentlarini qo'shish**

Run:
```bash
npx pnpm@latest dlx shadcn@latest add dialog alert-dialog input textarea label
```
Expected: 5 fayl `src/components/ui/` da yaratiladi. (Base UI primitivlar — `asChild` yo'q, bu kutilgan.)

- [ ] **Step 2: i18n matnlarini qo'shish**

`messages/uz.json` ga eng yuqori darajadagi `decks` kalitini qo'shing (mavjud `common`/`theme`/`landing`/`offline` yonига):
```json
"decks": {
  "title": "Deck'lar",
  "new": "Yangi deck",
  "cardCount": "{count} karta",
  "empty": {
    "title": "Hali deck yo'q",
    "description": "Birinchi deck'ingizni yarating va kartochkalar qo'shishni boshlang.",
    "cta": "Deck yaratish"
  },
  "menu": { "edit": "Tahrirlash", "delete": "O'chirish" },
  "form": {
    "createTitle": "Yangi deck",
    "editTitle": "Deck'ni tahrirlash",
    "nameLabel": "Nom",
    "namePlaceholder": "Masalan: Ingliz — Unit 1",
    "descriptionLabel": "Tavsif",
    "descriptionPlaceholder": "Ixtiyoriy",
    "colorLabel": "Rang",
    "cancel": "Bekor qilish",
    "create": "Yaratish",
    "save": "Saqlash"
  },
  "delete": {
    "title": "Deck'ni o'chirish",
    "description": "\"{name}\" o'chiriladi. Bu amalni ortga qaytarib bo'lmaydi.",
    "cancel": "Bekor qilish",
    "confirm": "O'chirish"
  },
  "errors": {
    "nameRequired": "Nom kiritilishi shart",
    "nameTooLong": "Nom 60 belgidan oshmasligi kerak",
    "loadFailed": "Deck'larni yuklab bo'lmadi."
  }
}
```

- [ ] **Step 3: Build tasdig'i**

Run: `npx pnpm@latest build`
Expected: xatosiz (JSON valid, komponentlar kompilyatsiya bo'ladi).

- [ ] **Step 4: Commit**

```bash
git add src/components/ui messages/uz.json package.json pnpm-lock.yaml
git commit -m "chore: add shadcn dialog/input primitives and decks i18n"
```

---

### Task 4: `/decks` sahifasi — ro'yxat + yaratish

**Files:**
- Create: `src/app/decks/page.tsx`
- Create: `src/app/decks/_components/decks-client.tsx`
- Create: `src/app/decks/_components/deck-list.tsx`
- Create: `src/app/decks/_components/deck-card.tsx`
- Create: `src/app/decks/_components/deck-form-dialog.tsx`
- Modify: `src/app/page.tsx` ("Boshlash" → `/decks` link)

**Interfaces:**
- Consumes: `createDeck`, `updateDeck`, `listDecks` (Task 2); `Deck`, `DeckInput`, `DECK_COLORS`, `DeckColor` (Task 1); `deckColorClasses` (Task 1); shadcn `Dialog*`, `Input`, `Textarea`, `Label`, `Button`, `buttonVariants` (Task 3/M0).
- Produces: `<DeckFormDialog>` (create+edit qobiliyatli, `deck?` bilan), `<DeckList>`, `<DeckCard>`, `<DecksClient>`.

- [ ] **Step 0: dexie-react-hooks o'rnatish**

Run: `npx pnpm@latest add dexie-react-hooks`
Expected: `package.json` ga qo'shiladi (DeckList `useLiveQuery` ishlatadi).

- [ ] **Step 1: DeckFormDialog (create+edit qobiliyatli)**

Create `src/app/decks/_components/deck-form-dialog.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DECK_COLORS, type Deck, type DeckColor, type DeckInput } from "@/lib/db/types";
import { deckColorClasses } from "@/lib/deck-colors";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deck?: Deck;
  onSubmit: (input: DeckInput) => Promise<void>;
};

export function DeckFormDialog({ open, onOpenChange, deck, onSubmit }: Props) {
  const t = useTranslations("decks.form");
  const tErr = useTranslations("decks.errors");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<DeckColor>("purple");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Dialog ochilganda formani deck bilan (yoki bo'sh) to'ldirish
  useEffect(() => {
    if (open) {
      setName(deck?.name ?? "");
      setDescription(deck?.description ?? "");
      setColor(deck?.color ?? "purple");
      setError(null);
    }
  }, [open, deck]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0) return setError(tErr("nameRequired"));
    if (trimmed.length > 60) return setError(tErr("nameTooLong"));
    setSaving(true);
    try {
      await onSubmit({ name: trimmed, description: description.trim(), color });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{deck ? t("editTitle") : t("createTitle")}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="deck-name">{t("nameLabel")}</Label>
            <Input
              id="deck-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="deck-desc">{t("descriptionLabel")}</Label>
            <Textarea
              id="deck-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("colorLabel")}</Label>
            <div className="flex flex-wrap gap-2">
              {DECK_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  aria-pressed={color === c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "size-11 rounded-full ring-2 ring-transparent transition",
                    deckColorClasses[c],
                    color === c && "ring-ring ring-offset-2 ring-offset-background",
                  )}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {deck ? t("save") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```
(Eslatma: `Textarea`/`Input`/`Dialog*` shadcn eksport nomlari; agar generatsiya qilingan fayl boshqa nom bergan bo'lsa (masalan `DialogClose`), importlarni real eksportlarга moslang.)

- [ ] **Step 2: DeckCard (display only)**

Create `src/app/decks/_components/deck-card.tsx`:
```tsx
"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deckColorClasses } from "@/lib/deck-colors";
import type { Deck } from "@/lib/db/types";

export function DeckCard({ deck }: { deck: Deck }) {
  const t = useTranslations("decks");
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className={cn("size-4 shrink-0 rounded-full", deckColorClasses[deck.color])} />
          <CardTitle className="truncate">{deck.name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {deck.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{deck.description}</p>
        )}
        <p className="text-xs text-muted-foreground">{t("cardCount", { count: 0 })}</p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: DeckList (live query + holatlar)**

Create `src/app/decks/_components/deck-list.tsx`:
```tsx
"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { listDecks } from "@/lib/db/decks";
import { DeckCard } from "./deck-card";

export function DeckList({ onCreate }: { onCreate: () => void }) {
  const t = useTranslations("decks");
  const decks = useLiveQuery(() => listDecks());

  // undefined = yuklanmoqda
  if (decks === undefined) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  // [] = bo'sh
  if (decks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-16 text-center">
        <h2 className="text-lg font-semibold">{t("empty.title")}</h2>
        <p className="max-w-sm text-sm text-muted-foreground">{t("empty.description")}</p>
        <Button className="min-h-11 rounded-2xl" onClick={onCreate}>
          {t("empty.cta")}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {decks.map((deck) => (
        <DeckCard key={deck.id} deck={deck} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: DecksClient (yaratish orkestratsiyasi)**

Create `src/app/decks/_components/decks-client.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { createDeck } from "@/lib/db/decks";
import type { DeckInput } from "@/lib/db/types";
import { DeckList } from "./deck-list";
import { DeckFormDialog } from "./deck-form-dialog";

export function DecksClient() {
  const t = useTranslations("decks");
  const [formOpen, setFormOpen] = useState(false);

  async function handleSubmit(input: DeckInput) {
    await createDeck(input);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button className="min-h-11 rounded-2xl" onClick={() => setFormOpen(true)}>
          {t("new")}
        </Button>
      </div>

      <DeckList onCreate={() => setFormOpen(true)} />

      <DeckFormDialog open={formOpen} onOpenChange={setFormOpen} onSubmit={handleSubmit} />
    </div>
  );
}
```

- [ ] **Step 5: /decks/page.tsx (server)**

Create `src/app/decks/page.tsx`:
```tsx
import { ThemeToggle } from "@/components/theme-toggle";
import { DecksClient } from "./_components/decks-client";

export default function DecksPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-6 px-6 py-6">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>
      <DecksClient />
    </div>
  );
}
```

- [ ] **Step 6: Landing "Boshlash" → /decks link**

`src/app/page.tsx` da `Button`ni link bilan almashtiring. `Button` Base UI bo'lgani uchun `buttonVariants` + `<Link>` ishlating:
```tsx
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
// ...
// eski <Button ...>{t("common.start")}</Button> o'rniga:
<Link
  href="/decks"
  className={cn(buttonVariants({ size: "lg" }), "min-h-11 rounded-2xl px-8")}
>
  {t("common.start")}
</Link>
```
(Agar `button.tsx` `buttonVariants`ni eksport qilmasa, uni tekshiring — shadcn odatda qiladi; qilmasa `<Button render={<Link href="/decks" />} ...>` ishlating.)

- [ ] **Step 7: Build tasdig'i**

Run: `npx pnpm@latest build`
Expected: xatosiz. `/decks` marshruti ro'yxatda ko'rinadi.

- [ ] **Step 8: Qo'lda tekshirish**

Run: `npx pnpm@latest dev`, `http://localhost:3000/decks` oching. "Yangi deck" bosing → dialog, nom + rang tanlab yarating → karta grid'da paydo bo'ladi. Landing'da "Boshlash" `/decks` ga o'tkazadi.

- [ ] **Step 9: Commit**

```bash
git add src/app/decks src/app/page.tsx
git commit -m "feat: add /decks page with deck list and creation"
```

---

### Task 5: Deck tahrirlash + o'chirish

**Files:**
- Create: `src/app/decks/_components/delete-deck-dialog.tsx`
- Modify: `src/app/decks/_components/deck-card.tsx` (⋯ menyu qo'shish)
- Modify: `src/app/decks/_components/deck-list.tsx` (onEdit/onDelete props uzatish)
- Modify: `src/app/decks/_components/decks-client.tsx` (edit/delete holati va wiring)

**Interfaces:**
- Consumes: `updateDeck`, `deleteDeck` (Task 2); `DeckFormDialog` (Task 4, `deck?` bilan edit); shadcn `AlertDialog*`, `DropdownMenu*`.
- Produces: `<DeleteDeckDialog>`; `DeckCard`/`DeckList` endi `onEdit(deck)`/`onDelete(deck)` qabul qiladi.

- [ ] **Step 1: DeleteDeckDialog**

Create `src/app/decks/_components/delete-deck-dialog.tsx`:
```tsx
"use client";

import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Deck } from "@/lib/db/types";

type Props = {
  deck: Deck | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
};

export function DeleteDeckDialog({ deck, onOpenChange, onConfirm }: Props) {
  const t = useTranslations("decks.delete");
  return (
    <AlertDialog open={deck !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("description", { name: deck?.name ?? "" })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm()}>{t("confirm")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```
(Eslatma: shadcn generatsiya qilgan `alert-dialog.tsx` dagi aniq eksport nomlarini tekshiring va moslang.)

- [ ] **Step 2: DeckCard ga ⋯ menyu qo'shish**

`src/app/decks/_components/deck-card.tsx` — props va menyu qo'shing. Yangi to'liq fayl:
```tsx
"use client";

import { MoreVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deckColorClasses } from "@/lib/deck-colors";
import type { Deck } from "@/lib/db/types";

type Props = {
  deck: Deck;
  onEdit: (deck: Deck) => void;
  onDelete: (deck: Deck) => void;
};

export function DeckCard({ deck, onEdit, onDelete }: Props) {
  const t = useTranslations("decks");
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className={cn("size-4 shrink-0 rounded-full", deckColorClasses[deck.color])} />
          <CardTitle className="truncate">{deck.name}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="ml-auto size-11" aria-label={t("menu.edit")}>
                  <MoreVertical className="size-5" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(deck)}>{t("menu.edit")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(deck)}>{t("menu.delete")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {deck.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{deck.description}</p>
        )}
        <p className="text-xs text-muted-foreground">{t("cardCount", { count: 0 })}</p>
      </CardContent>
    </Card>
  );
}
```
(Eslatma: `DropdownMenuTrigger` Base UI `render` prop ishlatadi — M0 theme-toggle bilan bir xil naqsh.)

- [ ] **Step 3: DeckList props'ni uzatish**

`src/app/decks/_components/deck-list.tsx` — `DeckList` signatura va `DeckCard` chaqiruvini yangilang:
```tsx
export function DeckList({
  onCreate,
  onEdit,
  onDelete,
}: {
  onCreate: () => void;
  onEdit: (deck: Deck) => void;
  onDelete: (deck: Deck) => void;
}) {
```
`import type { Deck } from "@/lib/db/types";` qo'shing va grid'da:
```tsx
{decks.map((deck) => (
  <DeckCard key={deck.id} deck={deck} onEdit={onEdit} onDelete={onDelete} />
))}
```

- [ ] **Step 4: DecksClient edit/delete wiring**

`src/app/decks/_components/decks-client.tsx` ni yangilang:
```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { createDeck, deleteDeck, updateDeck } from "@/lib/db/decks";
import type { Deck, DeckInput } from "@/lib/db/types";
import { DeckList } from "./deck-list";
import { DeckFormDialog } from "./deck-form-dialog";
import { DeleteDeckDialog } from "./delete-deck-dialog";

export function DecksClient() {
  const t = useTranslations("decks");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Deck | undefined>(undefined);
  const [deleting, setDeleting] = useState<Deck | null>(null);

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }
  function openEdit(deck: Deck) {
    setEditing(deck);
    setFormOpen(true);
  }

  async function handleSubmit(input: DeckInput) {
    if (editing) await updateDeck(editing.id, input);
    else await createDeck(input);
  }

  async function handleDelete() {
    if (deleting) await deleteDeck(deleting.id);
    setDeleting(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button className="min-h-11 rounded-2xl" onClick={openCreate}>
          {t("new")}
        </Button>
      </div>

      <DeckList onCreate={openCreate} onEdit={openEdit} onDelete={setDeleting} />

      <DeckFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        deck={editing}
        onSubmit={handleSubmit}
      />
      <DeleteDeckDialog
        deck={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
```

- [ ] **Step 5: Build tasdig'i**

Run: `npx pnpm@latest build`
Expected: xatosiz.

- [ ] **Step 6: Qo'lda tekshirish**

Run: `npx pnpm@latest dev`, `/decks` da: deck yarating → ⋯ → Tahrirlash (nom/rang o'zgartiring, saqlang, karta yangilanadi) → ⋯ → O'chirish (tasdiq, karta yo'qoladi).

- [ ] **Step 7: Commit**

```bash
git add src/app/decks
git commit -m "feat: add deck edit and delete"
```

---

## Self-Review

**Spec coverage (2026-07-03-ilmify-m1-decks-design.md):**
- §3 Deck/DeckInput/DeckColor tiplari → Task 1. ✅
- §4 fayl tuzilishi → Task 1/2/4/5 (db/, deck-colors, decks/_components). ✅
- §5 repository interfeysi (create/list/get/update/delete) → Task 2. ✅
- §6 UI oqimi (list/empty/loading, create, edit, delete, landing link) → Task 4 (list/empty/loading/create/link) + Task 5 (edit/delete). ✅
- §7 chekka holatlar (bo'sh nom, 60+, undefined loading) → Task 1 (zod), Task 4 (form validation + loading holati). ✅ IndexedDB bloklangan holati: `errors.loadFailed` matni Task 3'da bor, lekin DeckList undefined'ni faqat loading deb ko'rsatadi — Dexie xatosi kamdan-kam va M1′ uchun loading-state yetarli (spec §7 "qulamaydi" — useLiveQuery xato tashlamaydi, undefined qaytaradi). ✅
- §8 testlar (repository, fake-indexeddb) → Task 1 (zod test) + Task 2 (repository test). ✅
- §9 dep'lar (dexie, dexie-react-hooks, zod, fake-indexeddb) → Task 1 (zod), Task 2 (dexie, fake-indexeddb), Task 4 Step 0 (dexie-react-hooks). ✅
- §11 DoD 1-8 → barcha tasklar + build/test steplari. ✅

**Placeholder scan:** Kod bloklari to'liq; "TBD"/"TODO" yo'q. shadcn eksport nomlari uchun "moslang" eslatmalari real (generatsiya versiyaga qarab farq qilishi mumkin). ✅

**Type consistency:** `createDeck/listDecks/getDeck/updateDeck/deleteDeck`, `Deck`, `DeckInput`, `DeckColor`, `DECK_COLORS`, `deckColorClasses`, `deckInputSchema` — tasklararo izchil. `DeckFormDialog` props (`open/onOpenChange/deck/onSubmit`), `DeckList` props (`onCreate/onEdit/onDelete`), `DeckCard` props (`deck/onEdit/onDelete`), `DeleteDeckDialog` props (`deck/onOpenChange/onConfirm`) — Task 4/5 orasida mos. ✅
