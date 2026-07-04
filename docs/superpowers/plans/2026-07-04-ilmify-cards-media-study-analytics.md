# Ilmify — Kartalar + Media + Study + Analitika Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deck ichida rasm/audio/emoji'li front/back kartalar yaratish, study qilib avtomatik status (yangi→qiyin/oson→yodlangan) berish, va review tarixidan analitika ko'rsatish — plus PWA icon va deck edit/delete tuzatish.

**Architecture:** Sof mantiq (`card-status.ts`, `analytics.ts`) TDD bilan; PocketBase repository (`cards.ts`, `reviews.ts`) + TanStack Query hooks; App Router sahifalari (`/decks/[deckId]`, `/decks/[deckId]/study`, `/analytics`). Kartalar to'g'ridan-to'g'ri deck ichida (notes abstraksiyasi yo'q). Rasm/audio PocketBase file storage'da; grafiklar recharts.

**Tech Stack:** Next.js 16 (App Router, `--webpack`), React 19, PocketBase 0.27, TanStack Query 5, next-intl 4, Base UI, Tailwind v4, zod 4, recharts (yangi), Vitest (node env), Playwright.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-07-04-ilmify-cards-media-study-analytics-design.md`
- TypeScript **strict**; `pnpm build` (`next build --webpack`) xatosiz.
- Barcha UI matni `messages/uz.json`dan (next-intl); hardcode qilingan matn yo'q.
- Owner RLS barcha PB kolleksiyada: `@request.auth.id != "" && owner = @request.auth.id`.
- `pb-setup.mjs` **idempotent** — mavjud kolleksiyalarni hech qachon o'chirmaydi/o'zgartirmaydi.
- Xatolar **jimgina yutilmaydi** — foydalanuvchiga ko'rinadigan holat/xabar (mavjud kod inline `error` state ishlatadi; toast kutubxona yo'q — shu naqshga rioya).
- Test buyruqlari: unit `npx pnpm test` (vitest run), e2e `npx pnpm test:e2e`. Sandbox'da `npx pnpm` ishlatiladi (memory).
- Karta holati o'tish qoidalari (`nextStatus`): `hard`→`{hard,0}`; `medium`→`{new?hard:current, 0}`; `easy`→ streak+1, `≥3`→`{memorized,3}` else `{easy, streak}`.
- Fayl maydonlari: create'da `undefined`=fayl yo'q; update'da `undefined`=mavjudni saqla, `null`=o'chir, `File`=almashtir.
- PocketBase sana formati `"YYYY-MM-DD HH:mm:ss.SSSZ"` (probel bilan) — `.slice(0,10)` sanani beradi.

---

## File Structure

**Yangi fayllar:**
- `src/lib/card-types.ts` — Card/Review turlari, `cardInputSchema`, `mapRecordToCard`, `mapRecordToReview`.
- `src/lib/card-status.ts` + `.test.ts` — `nextStatus` sof funksiya.
- `src/lib/analytics.ts` + `.test.ts` — streak/daily/accuracy/growth/distribution.
- `src/lib/pb/cards.ts` — karta CRUD + `gradeCard`.
- `src/lib/pb/reviews.ts` — review create/list.
- `src/lib/pb/card-queries.ts` — `useCards`, `useCreateCard`, `useUpdateCard`, `useDeleteCard`, `useGradeCard`, `useDeckCardCount`.
- `src/lib/pb/review-queries.ts` — `useReviews`.
- `src/lib/card-status-colors.ts` — status → Tailwind klass + i18n kaliti.
- `src/app/decks/[deckId]/page.tsx` — deck detail (AuthGuard).
- `src/app/decks/[deckId]/_components/` — `deck-detail-client.tsx`, `card-list.tsx`, `card-row.tsx`, `status-filter.tsx`, `card-editor-dialog.tsx`, `media-upload.tsx`, `delete-card-dialog.tsx`.
- `src/app/decks/[deckId]/study/page.tsx` + `_components/study-client.tsx`, `study-card.tsx`, `study-summary.tsx`.
- `src/app/analytics/page.tsx` + `_components/analytics-client.tsx`, `stat-card.tsx`, `reviews-bar-chart.tsx`, `accuracy-line-chart.tsx`, `status-donut.tsx`.
- `src/components/app-nav.tsx` — Decklar / Analitika navigatsiya.

**O'zgartiriladigan fayllar:**
- `scripts/gen-icons.cjs` — gradient + "I" glyph.
- `package.json` — `gen-icons` script, `recharts` dep.
- `src/app/layout.tsx` — apple-touch-icon metadata.
- `scripts/pb-setup.mjs` — `ilmify_cards` + `ilmify_reviews`.
- `messages/uz.json` — yangi kalitlar.
- `src/app/decks/_components/deck-card.tsx` — haqiqiy son + `/decks/[id]` link; menyu bug fix.
- `src/app/decks/_components/decks-header.tsx` yoki yangi `app-nav.tsx` — Analitika havolasi.

---

## Task 1: PWA icon — gradient + "I" monogramma

**Files:**
- Modify: `scripts/gen-icons.cjs`
- Modify: `package.json:6-13` (scripts)
- Modify: `src/app/layout.tsx:20-29` (metadata icons)

**Interfaces:**
- Produces: `public/icons/icon-192.png`, `icon-512.png`, `maskable-512.png` (binafsha gradient + oq "I").

- [ ] **Step 1: `scripts/gen-icons.cjs` ni to'liq almashtirish**

```js
// scripts/gen-icons.cjs
// Binafsha vertikal gradient (#7c3aed -> #5b21b6) + markazda oq serif "I".
const fs = require("fs");
const zlib = require("zlib");

function crc32(buf){let c=~0;for(let i=0;i<buf.length;i++){c^=buf[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xEDB88320&-(c&1));}return (~c)>>>0;}
function chunk(type,data){const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const t=Buffer.from(type);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([len,t,data,crc]);}

const TOP=[124,58,237], BOT=[91,33,182], WHITE=[255,255,255];
function lerp(a,b,t){return Math.round(a+(b-a)*t);}

// "I" glyph normalized bounds (0..1). Serifli: yuqori/pastki plankalar + o'rta stem.
function inGlyph(nx,ny){
  const stem = nx>=0.42&&nx<=0.58&&ny>=0.24&&ny<=0.76;
  const top  = nx>=0.30&&nx<=0.70&&ny>=0.22&&ny<=0.31;
  const bot  = nx>=0.30&&nx<=0.70&&ny>=0.69&&ny<=0.78;
  return stem||top||bot;
}

function png(size){
  const sig=Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=2; // 8-bit RGB
  const rows=[];
  for(let y=0;y<size;y++){
    const row=Buffer.alloc(1+size*3); // filter byte + RGB
    const ty=y/(size-1);
    const bg=[lerp(TOP[0],BOT[0],ty),lerp(TOP[1],BOT[1],ty),lerp(TOP[2],BOT[2],ty)];
    for(let x=0;x<size;x++){
      const c=inGlyph(x/(size-1),ty)?WHITE:bg;
      row[1+x*3]=c[0];row[2+x*3]=c[1];row[3+x*3]=c[2];
    }
    rows.push(row);
  }
  const idat=zlib.deflateSync(Buffer.concat(rows));
  return Buffer.concat([sig,chunk("IHDR",ihdr),chunk("IDAT",idat),chunk("IEND",Buffer.alloc(0))]);
}

fs.mkdirSync("public/icons",{recursive:true});
fs.writeFileSync("public/icons/icon-192.png",png(192));
fs.writeFileSync("public/icons/icon-512.png",png(512));
fs.writeFileSync("public/icons/maskable-512.png",png(512));
console.log("icons written: gradient + I");
```

- [ ] **Step 2: `package.json` scripts'ga `gen-icons` qo'shish**

`"lint": "eslint",` qatoridan keyin qo'shing:

```json
    "gen-icons": "node scripts/gen-icons.cjs",
```

- [ ] **Step 3: Ikonkalarni generatsiya qilish**

Run: `node scripts/gen-icons.cjs`
Expected: `icons written: gradient + I`; `public/icons/*.png` yangilangan (fayl hajmi oldingidan katta).

- [ ] **Step 4: `src/app/layout.tsx` metadata'ga apple/icons qo'shish**

`generateMetadata` ichidagi `return { ... }` obyektiga `description` dan keyin qo'shing:

```ts
    icons: {
      icon: [
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
    },
```

- [ ] **Step 5: Vizual tekshirish**

Run: `node -e "const b=require('fs').readFileSync('public/icons/icon-192.png');console.log('bytes',b.length)"`
Expected: `bytes` > 2000 (gradient + glyph flat-rangdan katta). Ixtiyoriy: brauzerda `public/icons/icon-192.png` ochib oq "I" + binafsha gradient ko'rinishini tasdiqlash.

- [ ] **Step 6: Commit**

```bash
git add scripts/gen-icons.cjs package.json src/app/layout.tsx public/icons
git commit -m "feat: PWA icon with I monogram on purple gradient"
```

---

## Task 2: PocketBase kolleksiyalar — cards + reviews

**Files:**
- Modify: `scripts/pb-setup.mjs` (oxiriga, `console.log("done")` dan oldin)

**Interfaces:**
- Produces: `ilmify_cards`, `ilmify_reviews` kolleksiyalari (owner RLS, cascade, file maydonlar).

- [ ] **Step 1: `pb-setup.mjs` ga kolleksiya yaratishni qo'shish**

`console.log("done");` qatoridan **oldin** qo'shing (`decks` bloki `users` va `decks` id'larini oladi):

```js
// 3. ilmify_cards (base)
const decks = (await api("/api/collections?perPage=200", {}, token)).items.find((c) => c.name === "ilmify_decks");
const OWNER = '@request.auth.id != "" && owner = @request.auth.id';

if (!byName["ilmify_cards"]) {
  await api("/api/collections", { method: "POST", body: JSON.stringify({
    name: "ilmify_cards",
    type: "base",
    fields: [
      { name: "deck", type: "relation", required: true, maxSelect: 1, collectionId: decks.id, cascadeDelete: true },
      { name: "frontText", type: "text", required: false },
      { name: "frontImage", type: "file", required: false, maxSelect: 1, mimeTypes: ["image/jpeg","image/png","image/webp","image/gif"] },
      { name: "frontAudio", type: "file", required: false, maxSelect: 1, mimeTypes: ["audio/mpeg","audio/mp4","audio/wav","audio/ogg","audio/webm"] },
      { name: "backText", type: "text", required: false },
      { name: "backImage", type: "file", required: false, maxSelect: 1, mimeTypes: ["image/jpeg","image/png","image/webp","image/gif"] },
      { name: "backAudio", type: "file", required: false, maxSelect: 1, mimeTypes: ["audio/mpeg","audio/mp4","audio/wav","audio/ogg","audio/webm"] },
      { name: "icon", type: "text", required: false },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["new","hard","easy","memorized"] },
      { name: "easyStreak", type: "number", required: false },
      { name: "lastReviewed", type: "date", required: false },
      { name: "owner", type: "relation", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    listRule: OWNER, viewRule: OWNER, createRule: OWNER, updateRule: OWNER, deleteRule: OWNER,
  }) }, token);
  console.log("created ilmify_cards");
} else console.log("ilmify_cards exists, skip");

// 4. ilmify_reviews (base) — append-only jurnal
const cards = (await api("/api/collections?perPage=200", {}, token)).items.find((c) => c.name === "ilmify_cards");
if (!byName["ilmify_reviews"]) {
  await api("/api/collections", { method: "POST", body: JSON.stringify({
    name: "ilmify_reviews",
    type: "base",
    fields: [
      { name: "card", type: "relation", required: true, maxSelect: 1, collectionId: cards.id, cascadeDelete: true },
      { name: "deck", type: "relation", required: true, maxSelect: 1, collectionId: decks.id, cascadeDelete: true },
      { name: "grade", type: "select", required: true, maxSelect: 1, values: ["hard","medium","easy"] },
      { name: "owner", type: "relation", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
    ],
    listRule: OWNER, viewRule: OWNER, createRule: OWNER, updateRule: OWNER, deleteRule: OWNER,
  }) }, token);
  console.log("created ilmify_reviews");
} else console.log("ilmify_reviews exists, skip");
```

- [ ] **Step 2: Setup skriptni ishga tushirish (jonli PB)**

Run: `node --env-file=.env.local scripts/pb-setup.mjs`
Expected: `created ilmify_cards` va `created ilmify_reviews` (yoki qayta ishga tushirilsa `... exists, skip`), so'ng `done`. Mavjud `ilmify_users`/`ilmify_decks` `exists, skip`.

- [ ] **Step 3: Commit**

```bash
git add scripts/pb-setup.mjs
git commit -m "feat: add ilmify_cards and ilmify_reviews PB collections"
```

---

## Task 3: Card/Review turlari + zod schema + mapperlar

**Files:**
- Create: `src/lib/card-types.ts`
- Create: `src/lib/card-types.test.ts`

**Interfaces:**
- Produces:
  - `type CardStatus = "new" | "hard" | "easy" | "memorized"`
  - `type Grade = "hard" | "medium" | "easy"`
  - `type CardSide = { text: string; image?: string; audio?: string }`
  - `type CardSideInput = { text: string; image?: File | null; audio?: File | null }`
  - `type CardInput = { front: CardSideInput; back: CardSideInput; icon: string }`
  - `type Card = { id; deck; front: CardSide; back: CardSide; icon; status: CardStatus; easyStreak: number; lastReviewed: string | null; owner; created; updated }`
  - `type Review = { id; card; deck; grade: Grade; owner; created }`
  - `cardInputSchema` (zod; front matn yoki rasm shart), `CARD_STATUSES`, `GRADES`
  - `mapRecordToCard(r): Card`, `mapRecordToReview(r): Review`

- [ ] **Step 1: Failing test yozish — `src/lib/card-types.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { cardInputSchema, mapRecordToReview } from "@/lib/card-types";

const validSide = { text: "Salom", image: null, audio: null };

describe("cardInputSchema", () => {
  it("accepts front with text", () => {
    expect(() => cardInputSchema.parse({ front: validSide, back: validSide, icon: "" })).not.toThrow();
  });
  it("rejects empty front (no text, no image)", () => {
    expect(() =>
      cardInputSchema.parse({ front: { text: "  ", image: null, audio: null }, back: validSide, icon: "" }),
    ).toThrow();
  });
});

describe("mapRecordToReview", () => {
  it("maps a PB record to a Review", () => {
    const r = mapRecordToReview({
      id: "r1", card: "c1", deck: "d1", grade: "easy", owner: "u1",
      created: "2026-07-04 10:00:00.000Z", collectionId: "x", collectionName: "ilmify_reviews",
    });
    expect(r).toEqual({ id: "r1", card: "c1", deck: "d1", grade: "easy", owner: "u1", created: "2026-07-04 10:00:00.000Z" });
  });
});
```

- [ ] **Step 2: Testni ishga tushirib fail bo'lishini ko'rish**

Run: `npx pnpm test -- card-types`
Expected: FAIL — `card-types.ts` mavjud emas / import xatosi.

- [ ] **Step 3: `src/lib/card-types.ts` yozish**

```ts
import { z } from "zod";
import type { RecordModel } from "pocketbase";
import { pb } from "@/lib/pb/client";

export const CARD_STATUSES = ["new", "hard", "easy", "memorized"] as const;
export type CardStatus = (typeof CARD_STATUSES)[number];

export const GRADES = ["hard", "medium", "easy"] as const;
export type Grade = (typeof GRADES)[number];

export type CardSide = { text: string; image?: string; audio?: string };
export type CardSideInput = { text: string; image?: File | null; audio?: File | null };
export type CardInput = { front: CardSideInput; back: CardSideInput; icon: string };

export type Card = {
  id: string;
  deck: string;
  front: CardSide;
  back: CardSide;
  icon: string;
  status: CardStatus;
  easyStreak: number;
  lastReviewed: string | null;
  owner: string;
  created: string;
  updated: string;
};

export type Review = {
  id: string;
  card: string;
  deck: string;
  grade: Grade;
  owner: string;
  created: string;
};

// Fayl File | null | undefined; zod tekshirmaydi (env-bog'liq), faqat matn qoidasi.
const sideSchema = z.object({
  text: z.string(),
  image: z.any().optional(),
  audio: z.any().optional(),
});

export const cardInputSchema = z
  .object({ front: sideSchema, back: sideSchema, icon: z.string() })
  .superRefine((val, ctx) => {
    const hasFront = val.front.text.trim().length > 0 || val.front.image != null;
    if (!hasFront) {
      ctx.addIssue({ code: "custom", message: "Old tomon bo'sh", path: ["front"] });
    }
  });

export const gradeSchema = z.enum(GRADES);

function fileUrl(r: RecordModel, field: string): string | undefined {
  const name = r[field] as string | undefined;
  return name ? pb.files.getURL(r, name) : undefined;
}

export function mapRecordToCard(r: RecordModel): Card {
  return {
    id: r.id,
    deck: r.deck,
    front: { text: r.frontText ?? "", image: fileUrl(r, "frontImage"), audio: fileUrl(r, "frontAudio") },
    back: { text: r.backText ?? "", image: fileUrl(r, "backImage"), audio: fileUrl(r, "backAudio") },
    icon: r.icon ?? "",
    status: r.status,
    easyStreak: r.easyStreak ?? 0,
    lastReviewed: r.lastReviewed || null,
    owner: r.owner,
    created: r.created,
    updated: r.updated,
  };
}

export function mapRecordToReview(r: RecordModel): Review {
  return { id: r.id, card: r.card, deck: r.deck, grade: r.grade, owner: r.owner, created: r.created };
}
```

- [ ] **Step 4: Testni ishga tushirib pass bo'lishini ko'rish**

Run: `npx pnpm test -- card-types`
Expected: PASS (2 test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/card-types.ts src/lib/card-types.test.ts
git commit -m "feat: card/review types, zod schema, PB mappers"
```

---

## Task 4: `nextStatus` sof funksiya (TDD)

**Files:**
- Create: `src/lib/card-status.ts`
- Create: `src/lib/card-status.test.ts`

**Interfaces:**
- Consumes: `CardStatus`, `Grade` (`card-types.ts`).
- Produces: `nextStatus(current: CardStatus, easyStreak: number, grade: Grade): { status: CardStatus; easyStreak: number }`.

- [ ] **Step 1: Failing test — `src/lib/card-status.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { nextStatus } from "@/lib/card-status";

describe("nextStatus", () => {
  it("hard -> hard, resets streak", () => {
    expect(nextStatus("easy", 2, "hard")).toEqual({ status: "hard", easyStreak: 0 });
  });
  it("medium on new -> hard, streak 0", () => {
    expect(nextStatus("new", 0, "medium")).toEqual({ status: "hard", easyStreak: 0 });
  });
  it("medium keeps existing non-new status, resets streak", () => {
    expect(nextStatus("easy", 2, "medium")).toEqual({ status: "easy", easyStreak: 0 });
  });
  it("easy increments streak below threshold", () => {
    expect(nextStatus("new", 0, "easy")).toEqual({ status: "easy", easyStreak: 1 });
    expect(nextStatus("easy", 1, "easy")).toEqual({ status: "easy", easyStreak: 2 });
  });
  it("third consecutive easy -> memorized, streak capped at 3", () => {
    expect(nextStatus("easy", 2, "easy")).toEqual({ status: "memorized", easyStreak: 3 });
  });
  it("easy on memorized stays memorized", () => {
    expect(nextStatus("memorized", 3, "easy")).toEqual({ status: "memorized", easyStreak: 3 });
  });
});
```

- [ ] **Step 2: Fail bo'lishini ko'rish**

Run: `npx pnpm test -- card-status`
Expected: FAIL — `nextStatus` mavjud emas.

- [ ] **Step 3: `src/lib/card-status.ts` yozish**

```ts
import type { CardStatus, Grade } from "@/lib/card-types";

const EASY_THRESHOLD = 3;

export function nextStatus(
  current: CardStatus,
  easyStreak: number,
  grade: Grade,
): { status: CardStatus; easyStreak: number } {
  if (grade === "hard") return { status: "hard", easyStreak: 0 };
  if (grade === "medium") {
    return { status: current === "new" ? "hard" : current, easyStreak: 0 };
  }
  const streak = easyStreak + 1;
  if (streak >= EASY_THRESHOLD) return { status: "memorized", easyStreak: EASY_THRESHOLD };
  return { status: "easy", easyStreak: streak };
}
```

- [ ] **Step 4: Pass bo'lishini ko'rish**

Run: `npx pnpm test -- card-status`
Expected: PASS (6 test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/card-status.ts src/lib/card-status.test.ts
git commit -m "feat: nextStatus card state machine with tests"
```

---

## Task 5: Analitika sof funksiyalari (TDD)

**Files:**
- Create: `src/lib/analytics.ts`
- Create: `src/lib/analytics.test.ts`

**Interfaces:**
- Consumes: `Review`, `Card`, `CardStatus` (`card-types.ts`).
- Produces:
  - `computeStreak(reviewDates: string[], today: string): number`
  - `dailyReviewCounts(reviews: Review[], days: number, today: string): { date: string; count: number }[]`
  - `accuracyOverTime(reviews: Review[], days: number, today: string): { date: string; accuracy: number | null }[]`
  - `statusDistribution(cards: Card[]): Record<CardStatus, number>`
  - `growth(daily: { count: number }[]): number`

- [ ] **Step 1: Failing test — `src/lib/analytics.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { computeStreak, dailyReviewCounts, accuracyOverTime, statusDistribution, growth } from "@/lib/analytics";
import type { Review, Card } from "@/lib/card-types";

const rev = (created: string, grade: Review["grade"] = "easy"): Review =>
  ({ id: created + grade, card: "c", deck: "d", grade, owner: "u", created });

describe("computeStreak", () => {
  it("returns 0 for no reviews", () => {
    expect(computeStreak([], "2026-07-04")).toBe(0);
  });
  it("counts consecutive days ending today", () => {
    expect(computeStreak(["2026-07-04 09:00:00.000Z", "2026-07-03 09:00:00.000Z", "2026-07-02 08:00:00.000Z"], "2026-07-04")).toBe(3);
  });
  it("grace: today empty but yesterday reviewed", () => {
    expect(computeStreak(["2026-07-03 09:00:00.000Z", "2026-07-02 09:00:00.000Z"], "2026-07-04")).toBe(2);
  });
  it("breaks on a gap", () => {
    expect(computeStreak(["2026-07-04 09:00:00.000Z", "2026-07-01 09:00:00.000Z"], "2026-07-04")).toBe(1);
  });
});

describe("dailyReviewCounts", () => {
  it("fills zero days across the window", () => {
    const out = dailyReviewCounts([rev("2026-07-04 09:00:00.000Z"), rev("2026-07-04 10:00:00.000Z")], 3, "2026-07-04");
    expect(out).toEqual([
      { date: "2026-07-02", count: 0 },
      { date: "2026-07-03", count: 0 },
      { date: "2026-07-04", count: 2 },
    ]);
  });
});

describe("accuracyOverTime", () => {
  it("computes (easy+medium)/total percent, null when no reviews", () => {
    const out = accuracyOverTime(
      [rev("2026-07-04 09:00:00.000Z", "easy"), rev("2026-07-04 10:00:00.000Z", "hard")],
      2, "2026-07-04",
    );
    expect(out).toEqual([
      { date: "2026-07-03", accuracy: null },
      { date: "2026-07-04", accuracy: 50 },
    ]);
  });
});

describe("statusDistribution", () => {
  it("counts each status", () => {
    const card = (status: Card["status"]): Card =>
      ({ id: status, deck: "d", front: { text: "" }, back: { text: "" }, icon: "", status, easyStreak: 0, lastReviewed: null, owner: "u", created: "", updated: "" });
    expect(statusDistribution([card("new"), card("easy"), card("easy"), card("memorized")])).toEqual({ new: 1, hard: 0, easy: 2, memorized: 1 });
  });
});

describe("growth", () => {
  it("positive when last 7 days exceed prior 7", () => {
    const daily = Array.from({ length: 14 }, (_, i) => ({ count: i < 7 ? 1 : 2 })); // prev7=7, last7=14
    expect(growth(daily)).toBe(100);
  });
  it("zero prior with activity -> 100", () => {
    const daily = Array.from({ length: 14 }, (_, i) => ({ count: i < 7 ? 0 : 3 }));
    expect(growth(daily)).toBe(100);
  });
});
```

- [ ] **Step 2: Fail bo'lishini ko'rish**

Run: `npx pnpm test -- analytics`
Expected: FAIL — `analytics.ts` mavjud emas.

- [ ] **Step 3: `src/lib/analytics.ts` yozish**

```ts
import type { Review, Card, CardStatus } from "@/lib/card-types";

function day(iso: string): string {
  return iso.slice(0, 10);
}

function addDays(date: string, delta: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function computeStreak(reviewDates: string[], today: string): number {
  const days = new Set(reviewDates.map(day));
  if (days.size === 0) return 0;
  let cursor = day(today);
  if (!days.has(cursor)) cursor = addDays(cursor, -1); // bugungi kunga grace
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function dailyReviewCounts(
  reviews: Review[],
  days: number,
  today: string,
): { date: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of reviews) counts.set(day(r.created), (counts.get(day(r.created)) ?? 0) + 1);
  const out: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(day(today), -i);
    out.push({ date: d, count: counts.get(d) ?? 0 });
  }
  return out;
}

export function accuracyOverTime(
  reviews: Review[],
  days: number,
  today: string,
): { date: string; accuracy: number | null }[] {
  const totals = new Map<string, { correct: number; total: number }>();
  for (const r of reviews) {
    const d = day(r.created);
    const e = totals.get(d) ?? { correct: 0, total: 0 };
    e.total++;
    if (r.grade === "easy" || r.grade === "medium") e.correct++;
    totals.set(d, e);
  }
  const out: { date: string; accuracy: number | null }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(day(today), -i);
    const e = totals.get(d);
    out.push({ date: d, accuracy: e ? Math.round((e.correct / e.total) * 100) : null });
  }
  return out;
}

export function statusDistribution(cards: Card[]): Record<CardStatus, number> {
  const dist: Record<CardStatus, number> = { new: 0, hard: 0, easy: 0, memorized: 0 };
  for (const c of cards) dist[c.status]++;
  return dist;
}

export function growth(daily: { count: number }[]): number {
  const n = daily.length;
  const last7 = daily.slice(Math.max(0, n - 7)).reduce((s, d) => s + d.count, 0);
  const prev7 = daily.slice(Math.max(0, n - 14), Math.max(0, n - 7)).reduce((s, d) => s + d.count, 0);
  if (prev7 === 0) return last7 > 0 ? 100 : 0;
  return Math.round(((last7 - prev7) / prev7) * 100);
}
```

- [ ] **Step 4: Pass bo'lishini ko'rish**

Run: `npx pnpm test -- analytics`
Expected: PASS (barcha test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics.ts src/lib/analytics.test.ts
git commit -m "feat: analytics pure functions (streak, daily, accuracy, growth, distribution)"
```

---

## Task 6: Cards + Reviews repository

**Files:**
- Create: `src/lib/pb/reviews.ts`
- Create: `src/lib/pb/cards.ts`

**Interfaces:**
- Consumes: `card-types.ts` (types, schema, mappers), `card-status.ts` (`nextStatus`), `pb/client.ts` (`pb`).
- Produces:
  - reviews: `createReview(input: { card: string; deck: string; grade: Grade }): Promise<Review>`, `listReviews(deckId?: string): Promise<Review[]>`
  - cards: `listCards(deckId: string): Promise<Card[]>`, `createCard(deckId, input: CardInput): Promise<Card>`, `updateCard(id, input: CardInput): Promise<Card>`, `deleteCard(id): Promise<void>`, `countCardsByDeck(deckId): Promise<number>`, `gradeCard(args: { cardId: string; deckId: string; current: CardStatus; easyStreak: number; grade: Grade }): Promise<void>`

- [ ] **Step 1: `src/lib/pb/reviews.ts` yozish**

```ts
import { pb } from "@/lib/pb/client";
import { type Review, type Grade, mapRecordToReview } from "@/lib/card-types";

const COL = "ilmify_reviews";

export async function createReview(input: { card: string; deck: string; grade: Grade }): Promise<Review> {
  const owner = pb.authStore.record?.id;
  if (!owner) throw new Error("Not authenticated");
  const record = await pb.collection(COL).create({ ...input, owner });
  return mapRecordToReview(record);
}

export async function listReviews(deckId?: string): Promise<Review[]> {
  const records = await pb.collection(COL).getFullList({
    sort: "created",
    ...(deckId ? { filter: `deck = "${deckId}"` } : {}),
  });
  return records.map(mapRecordToReview);
}
```

- [ ] **Step 2: `src/lib/pb/cards.ts` yozish**

```ts
import { pb } from "@/lib/pb/client";
import {
  type Card,
  type CardInput,
  type CardStatus,
  type Grade,
  cardInputSchema,
  mapRecordToCard,
} from "@/lib/card-types";
import { nextStatus } from "@/lib/card-status";
import { createReview } from "@/lib/pb/reviews";

const COL = "ilmify_cards";

function applyFile(fd: FormData, field: string, value: File | null | undefined) {
  if (value instanceof File) fd.set(field, value);
  else if (value === null) fd.set(field, ""); // o'chirish
  // undefined -> tegilmaydi (update'da mavjudni saqlaydi)
}

function buildFormData(input: CardInput, extra: Record<string, string>): FormData {
  const fd = new FormData();
  fd.set("frontText", input.front.text);
  fd.set("backText", input.back.text);
  fd.set("icon", input.icon ?? "");
  for (const [k, v] of Object.entries(extra)) fd.set(k, v);
  applyFile(fd, "frontImage", input.front.image);
  applyFile(fd, "frontAudio", input.front.audio);
  applyFile(fd, "backImage", input.back.image);
  applyFile(fd, "backAudio", input.back.audio);
  return fd;
}

export async function listCards(deckId: string): Promise<Card[]> {
  const records = await pb.collection(COL).getFullList({ filter: `deck = "${deckId}"`, sort: "-updated" });
  return records.map(mapRecordToCard);
}

export async function countCardsByDeck(deckId: string): Promise<number> {
  const res = await pb.collection(COL).getList(1, 1, { filter: `deck = "${deckId}"` });
  return res.totalItems;
}

export async function createCard(deckId: string, input: CardInput): Promise<Card> {
  cardInputSchema.parse(input);
  const owner = pb.authStore.record?.id;
  if (!owner) throw new Error("Not authenticated");
  const fd = buildFormData(input, { deck: deckId, owner, status: "new", easyStreak: "0" });
  const record = await pb.collection(COL).create(fd);
  return mapRecordToCard(record);
}

export async function updateCard(id: string, input: CardInput): Promise<Card> {
  cardInputSchema.parse(input);
  const fd = buildFormData(input, {});
  const record = await pb.collection(COL).update(id, fd);
  return mapRecordToCard(record);
}

export async function deleteCard(id: string): Promise<void> {
  await pb.collection(COL).delete(id);
}

export async function gradeCard(args: {
  cardId: string;
  deckId: string;
  current: CardStatus;
  easyStreak: number;
  grade: Grade;
}): Promise<void> {
  const { cardId, deckId, current, easyStreak, grade } = args;
  await createReview({ card: cardId, deck: deckId, grade }); // avval jurnal (analitika manbai)
  const next = nextStatus(current, easyStreak, grade);
  await pb.collection(COL).update(cardId, {
    status: next.status,
    easyStreak: next.easyStreak,
    lastReviewed: new Date().toISOString(),
  });
}
```

- [ ] **Step 3: Typecheck (repo TS to'g'ri)**

Run: `npx pnpm exec tsc --noEmit`
Expected: xatosiz (yoki faqat hali yozilmagan sahifalarга aloqasi yo'q). Agar `tsc` butun loyihaga tegib boshqa hali-yaratilmagan importlardan shikoyat qilsa, bu task fayllariga oid xato bo'lmasligini tasdiqlang.

- [ ] **Step 4: Commit**

```bash
git add src/lib/pb/cards.ts src/lib/pb/reviews.ts
git commit -m "feat: cards and reviews PocketBase repository"
```

---

## Task 7: TanStack Query hooks (cards + reviews)

**Files:**
- Create: `src/lib/pb/card-queries.ts`
- Create: `src/lib/pb/review-queries.ts`

**Interfaces:**
- Consumes: `pb/cards.ts`, `pb/reviews.ts`, `card-types.ts`.
- Produces:
  - `useCards(deckId): UseQueryResult<Card[]>` (key `["cards", deckId]`)
  - `useDeckCardCount(deckId): UseQueryResult<number>` (key `["cardCount", deckId]`)
  - `useCreateCard(deckId)`, `useUpdateCard(deckId)`, `useDeleteCard(deckId)` — mutations
  - `useGradeCard(deckId)` — mutation over `gradeCard` args
  - `useReviews(deckId?): UseQueryResult<Review[]>` (key `["reviews", deckId ?? "all"]`)

- [ ] **Step 1: `src/lib/pb/card-queries.ts` yozish**

```ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCard,
  updateCard,
  deleteCard,
  listCards,
  countCardsByDeck,
  gradeCard,
} from "@/lib/pb/cards";
import type { CardInput, CardStatus, Grade } from "@/lib/card-types";

export function useCards(deckId: string) {
  return useQuery({ queryKey: ["cards", deckId], queryFn: () => listCards(deckId) });
}

export function useDeckCardCount(deckId: string) {
  return useQuery({ queryKey: ["cardCount", deckId], queryFn: () => countCardsByDeck(deckId) });
}

function useInvalidate(deckId: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["cards", deckId] });
    qc.invalidateQueries({ queryKey: ["cardCount", deckId] });
    qc.invalidateQueries({ queryKey: ["reviews"] });
  };
}

export function useCreateCard(deckId: string) {
  const invalidate = useInvalidate(deckId);
  return useMutation({
    mutationFn: (input: CardInput) => createCard(deckId, input),
    onSuccess: invalidate,
  });
}

export function useUpdateCard(deckId: string) {
  const invalidate = useInvalidate(deckId);
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CardInput }) => updateCard(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteCard(deckId: string) {
  const invalidate = useInvalidate(deckId);
  return useMutation({ mutationFn: (id: string) => deleteCard(id), onSuccess: invalidate });
}

export function useGradeCard(deckId: string) {
  const invalidate = useInvalidate(deckId);
  return useMutation({
    mutationFn: (args: { cardId: string; current: CardStatus; easyStreak: number; grade: Grade }) =>
      gradeCard({ ...args, deckId }),
    onSuccess: invalidate,
  });
}
```

- [ ] **Step 2: `src/lib/pb/review-queries.ts` yozish**

```ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { listReviews } from "@/lib/pb/reviews";

export function useReviews(deckId?: string) {
  return useQuery({ queryKey: ["reviews", deckId ?? "all"], queryFn: () => listReviews(deckId) });
}
```

**Not (invalidatsiya):** `useInvalidate` `["reviews"]` prefiksni invalidatsiya qiladi; `useReviews` kaliti `["reviews", ...]` shu prefiks ostida — grade'dan keyin analitika yangilanadi.

- [ ] **Step 3: Typecheck**

Run: `npx pnpm exec tsc --noEmit`
Expected: bu fayllarga oid xato yo'q.

- [ ] **Step 4: Commit**

```bash
git add src/lib/pb/card-queries.ts src/lib/pb/review-queries.ts
git commit -m "feat: TanStack Query hooks for cards and reviews"
```

---

## Task 8: i18n kalitlar + status ranglari

**Files:**
- Modify: `messages/uz.json`
- Create: `src/lib/card-status-colors.ts`

**Interfaces:**
- Produces: `cardStatusMeta: Record<CardStatus, { dot: string; badge: string; key: string }>` — status → Tailwind klasslar + i18n kalit nomi (`cards.status.<key>`).

- [ ] **Step 1: `messages/uz.json` ga `cards`, `study`, `analytics`, `nav` bloklarini qo'shish**

`"decks": { ... }` blokidan **keyin** (vergul bilan) qo'shing:

```json
  "nav": {
    "decks": "Deck'lar",
    "analytics": "Analitika"
  },
  "cards": {
    "title": "Kartalar",
    "new": "Yangi karta",
    "study": "O'rganish",
    "back": "Orqaga",
    "count": "{count} karta",
    "empty": {
      "title": "Hali karta yo'q",
      "description": "Birinchi kartangizni yarating.",
      "cta": "Karta yaratish"
    },
    "status": {
      "all": "Hammasi",
      "new": "Yangi",
      "hard": "Qiyin",
      "easy": "Oson",
      "memorized": "Yodlangan"
    },
    "menu": { "edit": "Tahrirlash", "delete": "O'chirish", "open": "Amallar" },
    "form": {
      "createTitle": "Yangi karta",
      "editTitle": "Kartani tahrirlash",
      "front": "Old tomon",
      "back": "Orqa tomon",
      "textPlaceholder": "Matn kiriting",
      "icon": "Ikonka",
      "addImage": "Rasm",
      "addAudio": "Audio",
      "remove": "O'chirish",
      "cancel": "Bekor qilish",
      "create": "Yaratish",
      "save": "Saqlash"
    },
    "delete": {
      "title": "Kartani o'chirish",
      "description": "Bu karta o'chiriladi. Ortga qaytarib bo'lmaydi.",
      "cancel": "Bekor qilish",
      "confirm": "O'chirish"
    },
    "errors": {
      "frontRequired": "Old tomon bo'sh bo'lishi mumkin emas",
      "saveFailed": "Saqlab bo'lmadi. Qaytadan urinib ko'ring.",
      "loadFailed": "Kartalarni yuklab bo'lmadi.",
      "fileTooLarge": "Fayl juda katta (maksimum 5MB)."
    }
  },
  "study": {
    "showAnswer": "Javobni ko'rish",
    "hard": "Qiyin",
    "medium": "O'rtacha",
    "easy": "Oson",
    "progress": "{done} / {total}",
    "empty": "Avval karta qo'shing",
    "gradeFailed": "Bahoni saqlab bo'lmadi. Qaytadan urinib ko'ring.",
    "summary": {
      "title": "Sessiya tugadi",
      "reviewed": "{count} karta ko'rildi",
      "again": "Qayta o'rganish",
      "backToDeck": "Deck'ga qaytish"
    }
  },
  "analytics": {
    "title": "Analitika",
    "empty": "Hali o'rganish yo'q. Kartalarni o'rganishni boshlang.",
    "streak": "Ketma-ket kunlar",
    "streakDays": "{count} kun",
    "totalDecks": "Deck'lar",
    "totalCards": "Kartalar",
    "totalReviews": "Takrorlashlar",
    "memorizedPct": "Yodlangan",
    "dailyReviews": "Kunlik takrorlashlar",
    "accuracy": "Aniqlik",
    "distribution": "Karta holati",
    "growthUp": "▲ {pct}%",
    "growthDown": "▼ {pct}%",
    "growthFlat": "0%"
  }
```

- [ ] **Step 2: JSON to'g'riligini tekshirish**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/uz.json','utf8'));console.log('valid json')"`
Expected: `valid json`.

- [ ] **Step 3: `src/lib/card-status-colors.ts` yozish**

```ts
import type { CardStatus } from "@/lib/card-types";

// status -> nuqta rangi (badge/dot) + i18n kalit. cards.status.<key>.
export const cardStatusMeta: Record<CardStatus, { dot: string; key: CardStatus }> = {
  new: { dot: "bg-slate-400", key: "new" },
  hard: { dot: "bg-red-500", key: "hard" },
  easy: { dot: "bg-emerald-500", key: "easy" },
  memorized: { dot: "bg-violet-500", key: "memorized" },
};

// Analitika donut/chart uchun hex ranglar (recharts).
export const cardStatusHex: Record<CardStatus, string> = {
  new: "#94a3b8",
  hard: "#ef4444",
  easy: "#10b981",
  memorized: "#8b5cf6",
};
```

- [ ] **Step 4: Commit**

```bash
git add messages/uz.json src/lib/card-status-colors.ts
git commit -m "feat: i18n strings and card status color meta"
```

---

## Task 9: `media-upload` komponent

**Files:**
- Create: `src/app/decks/[deckId]/_components/media-upload.tsx`

**Interfaces:**
- Consumes: `Button`, i18n.
- Produces: `MediaUpload` komponent:
  ```ts
  type MediaValue = File | null | undefined; // File=yangi, null=o'chirilgan, undefined=o'zgarmagan
  function MediaUpload(props: {
    kind: "image" | "audio";
    existingUrl?: string;       // mavjud karta URL'i (edit)
    value: MediaValue;
    onChange: (v: MediaValue) => void;
    onError: (msg: string) => void;
  }): JSX.Element
  ```
  Ko'rsatadi: yuklash tugmasi; tanlangan/mavjud media preview (rasm `<img>` yoki audio `<audio controls>`); o'chirish tugmasi. 5MB dan katta fayl → `onError`, `onChange` chaqirilmaydi.

- [ ] **Step 1: `media-upload.tsx` yozish**

```tsx
"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Music, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type MediaValue = File | null | undefined;
const MAX_BYTES = 5 * 1024 * 1024;

export function MediaUpload({
  kind,
  existingUrl,
  value,
  onChange,
  onError,
}: {
  kind: "image" | "audio";
  existingUrl?: string;
  value: MediaValue;
  onChange: (v: MediaValue) => void;
  onError: (msg: string) => void;
}) {
  const t = useTranslations("cards.form");
  const inputRef = useRef<HTMLInputElement>(null);

  // Ko'rsatiladigan manba: yangi File > (o'chirilmagan bo'lsa) mavjud URL.
  const previewUrl =
    value instanceof File ? URL.createObjectURL(value) : value === null ? undefined : existingUrl;

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // bir xil faylni qayta tanlashga ruxsat
    if (!file) return;
    if (file.size > MAX_BYTES) return onError(t("errors.fileTooLarge" as never) ?? "");
    onChange(file);
  }

  function remove() {
    onChange(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={kind === "image" ? "image/*" : "audio/*"}
        className="hidden"
        onChange={pick}
      />
      {previewUrl ? (
        <div className="flex items-center gap-2">
          {kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element -- PB blob/URL, next/image shart emas
            <img src={previewUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
          ) : (
            <audio src={previewUrl} controls className="h-10" />
          )}
          <Button type="button" variant="ghost" size="icon" aria-label={t("remove")} onClick={remove}>
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          className="w-fit gap-2"
          onClick={() => inputRef.current?.click()}
        >
          {kind === "image" ? <ImagePlus className="size-4" /> : <Music className="size-4" />}
          {kind === "image" ? t("addImage") : t("addAudio")}
        </Button>
      )}
    </div>
  );
}
```

> Not: `t("errors.fileTooLarge")` — namespace `cards.form` bo'lgani uchun to'liq yo'l `cards.errors.fileTooLarge` emas. Buni to'g'rilash uchun quyidagi Step 2'da tekshiring.

- [ ] **Step 2: Xato xabari namespace'ini to'g'rilash**

`onError` chaqiruvida `cards.errors.fileTooLarge` ishlatilishi kerak. `MediaUpload` ichida `useTranslations("cards")` ga o'zgartiring va matnlarni `t("form.addImage")`, `t("form.remove")`, `t("errors.fileTooLarge")` ko'rinishida chaqiring:

```tsx
  const t = useTranslations("cards");
  // ... previewUrl uchun:
    if (file.size > MAX_BYTES) return onError(t("errors.fileTooLarge"));
  // tugmalarda:
    aria-label={t("form.remove")}
    {kind === "image" ? t("form.addImage") : t("form.addAudio")}
```

- [ ] **Step 3: Typecheck**

Run: `npx pnpm exec tsc --noEmit`
Expected: `media-upload.tsx` ga oid xato yo'q.

- [ ] **Step 4: Commit**

```bash
git add "src/app/decks/[deckId]/_components/media-upload.tsx"
git commit -m "feat: reusable media-upload component (image/audio, 5MB guard)"
```

---

## Task 10: Card editor dialog

**Files:**
- Create: `src/app/decks/[deckId]/_components/card-editor-dialog.tsx`

**Interfaces:**
- Consumes: `Dialog*`, `Input`, `Textarea`, `Label`, `Button`, `MediaUpload`, `CardInput`, `Card`, i18n.
- Produces: `CardEditorDialog(props: { open: boolean; onOpenChange: (o: boolean) => void; card?: Card; onSubmit: (input: CardInput) => Promise<void> })`.

- [ ] **Step 1: `card-editor-dialog.tsx` yozish**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
import type { Card, CardInput } from "@/lib/card-types";
import { MediaUpload, type MediaValue } from "./media-upload";

const EMOJIS = ["📘", "📗", "🧠", "🔤", "🔢", "🌍", "🧪", "🎵", "⭐", "❓"];

export function CardEditorDialog({
  open,
  onOpenChange,
  card,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  card?: Card;
  onSubmit: (input: CardInput) => Promise<void>;
}) {
  const t = useTranslations("cards");
  const [frontText, setFrontText] = useState("");
  const [backText, setBackText] = useState("");
  const [icon, setIcon] = useState("");
  const [frontImage, setFrontImage] = useState<MediaValue>(undefined);
  const [frontAudio, setFrontAudio] = useState<MediaValue>(undefined);
  const [backImage, setBackImage] = useState<MediaValue>(undefined);
  const [backAudio, setBackAudio] = useState<MediaValue>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- dialog ochilganda prop-sync
      setFrontText(card?.front.text ?? "");
      setBackText(card?.back.text ?? "");
      setIcon(card?.icon ?? "");
      setFrontImage(undefined);
      setFrontAudio(undefined);
      setBackImage(undefined);
      setBackAudio(undefined);
      setError(null);
    }
  }, [open, card]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (frontText.trim().length === 0 && !(frontImage instanceof File) && !card?.front.image) {
      return setError(t("errors.frontRequired"));
    }
    setSaving(true);
    try {
      await onSubmit({
        front: { text: frontText.trim(), image: frontImage, audio: frontAudio },
        back: { text: backText.trim(), image: backImage, audio: backAudio },
        icon,
      });
      onOpenChange(false);
    } catch {
      setError(t("errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex max-h-[80vh] flex-col gap-4 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{card ? t("form.editTitle") : t("form.createTitle")}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="front-text">{t("form.front")}</Label>
            <Textarea
              id="front-text"
              value={frontText}
              onChange={(e) => setFrontText(e.target.value)}
              placeholder={t("form.textPlaceholder")}
              autoFocus
            />
            <MediaUpload kind="image" existingUrl={card?.front.image} value={frontImage} onChange={setFrontImage} onError={setError} />
            <MediaUpload kind="audio" existingUrl={card?.front.audio} value={frontAudio} onChange={setFrontAudio} onError={setError} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="back-text">{t("form.back")}</Label>
            <Textarea
              id="back-text"
              value={backText}
              onChange={(e) => setBackText(e.target.value)}
              placeholder={t("form.textPlaceholder")}
            />
            <MediaUpload kind="image" existingUrl={card?.back.image} value={backImage} onChange={setBackImage} onError={setError} />
            <MediaUpload kind="audio" existingUrl={card?.back.audio} value={backAudio} onChange={setBackAudio} onError={setError} />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("form.icon")}</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  aria-label={em}
                  aria-pressed={icon === em}
                  onClick={() => setIcon(icon === em ? "" : em)}
                  className={`size-11 rounded-full text-xl ring-2 transition ${icon === em ? "ring-ring" : "ring-transparent"}`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("form.cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {card ? t("form.save") : t("form.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx pnpm exec tsc --noEmit`
Expected: bu faylga oid xato yo'q.

- [ ] **Step 3: Commit**

```bash
git add "src/app/decks/[deckId]/_components/card-editor-dialog.tsx"
git commit -m "feat: card editor dialog with front/back text, media, emoji icon"
```

---

## Task 11: Deck detail sahifasi — list, filtr, CRUD

**Files:**
- Create: `src/app/decks/[deckId]/page.tsx`
- Create: `src/app/decks/[deckId]/_components/deck-detail-client.tsx`
- Create: `src/app/decks/[deckId]/_components/status-filter.tsx`
- Create: `src/app/decks/[deckId]/_components/card-row.tsx`
- Create: `src/app/decks/[deckId]/_components/delete-card-dialog.tsx`

**Interfaces:**
- Consumes: `useCards`, `useCreateCard`, `useUpdateCard`, `useDeleteCard`, `CardEditorDialog`, `cardStatusMeta`, `AuthGuard`, i18n.
- Produces: `/decks/[deckId]` sahifasi — filtr chiplari + karta ro'yxati + create/edit/delete + "O'rganish" link.

- [ ] **Step 1: `page.tsx` (server, AuthGuard wrapper)**

```tsx
import { AuthGuard } from "@/components/auth/auth-guard";
import { DeckDetailClient } from "./_components/deck-detail-client";

export default async function DeckDetailPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = await params;
  return (
    <AuthGuard>
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-6 px-6 py-6">
        <DeckDetailClient deckId={deckId} />
      </div>
    </AuthGuard>
  );
}
```

- [ ] **Step 2: `status-filter.tsx`**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { CardStatus } from "@/lib/card-types";

export type StatusFilter = "all" | CardStatus;
const ORDER: StatusFilter[] = ["all", "new", "hard", "easy", "memorized"];

export function StatusFilterBar({
  value,
  counts,
  onChange,
}: {
  value: StatusFilter;
  counts: Record<StatusFilter, number>;
  onChange: (v: StatusFilter) => void;
}) {
  const t = useTranslations("cards.status");
  return (
    <div className="flex flex-wrap gap-2">
      {ORDER.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          aria-pressed={value === s}
          className={cn(
            "min-h-9 rounded-full border px-3 text-sm transition",
            value === s ? "border-brand bg-brand/10 text-brand" : "border-border text-muted-foreground",
          )}
        >
          {t(s)} ({counts[s]})
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: `delete-card-dialog.tsx`**

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

export function DeleteCardDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: () => void;
}) {
  const t = useTranslations("cards.delete");
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{t("confirm")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 4: `card-row.tsx`**

```tsx
"use client";

import { MoreVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card as UiCard, CardContent } from "@/components/ui/card";
import { cardStatusMeta } from "@/lib/card-status-colors";
import type { Card } from "@/lib/card-types";

export function CardRow({
  card,
  onEdit,
  onDelete,
}: {
  card: Card;
  onEdit: (c: Card) => void;
  onDelete: (c: Card) => void;
}) {
  const t = useTranslations("cards");
  const tStatus = useTranslations("cards.status");
  const meta = cardStatusMeta[card.status];
  return (
    <UiCard className="rounded-2xl">
      <CardContent className="flex items-center gap-3 py-4">
        {card.icon && <span className="text-2xl">{card.icon}</span>}
        {card.front.image && (
          // eslint-disable-next-line @next/next/no-img-element -- PB URL
          <img src={card.front.image} alt="" className="size-10 rounded-md object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{card.front.text || "—"}</p>
          <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("size-2 rounded-full", meta.dot)} />
            {tStatus(meta.key)}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="size-11" aria-label={t("menu.open")}>
                <MoreVertical className="size-5" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(card)}>{t("menu.edit")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(card)}>{t("menu.delete")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </UiCard>
  );
}
```

- [ ] **Step 5: `deck-detail-client.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCards, useCreateCard, useUpdateCard, useDeleteCard } from "@/lib/pb/card-queries";
import type { Card, CardInput, CardStatus } from "@/lib/card-types";
import { CardEditorDialog } from "./card-editor-dialog";
import { CardRow } from "./card-row";
import { StatusFilterBar, type StatusFilter } from "./status-filter";
import { DeleteCardDialog } from "./delete-card-dialog";

export function DeckDetailClient({ deckId }: { deckId: string }) {
  const t = useTranslations("cards");
  const { data: cards, isLoading, error } = useCards(deckId);
  const createM = useCreateCard(deckId);
  const updateM = useUpdateCard(deckId);
  const deleteM = useDeleteCard(deckId);

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Card | undefined>(undefined);
  const [deleting, setDeleting] = useState<Card | null>(null);

  const counts = useMemo(() => {
    const base: Record<StatusFilter, number> = { all: 0, new: 0, hard: 0, easy: 0, memorized: 0 };
    for (const c of cards ?? []) {
      base.all++;
      base[c.status]++;
    }
    return base;
  }, [cards]);

  const visible = useMemo(
    () => (cards ?? []).filter((c) => filter === "all" || c.status === filter),
    [cards, filter],
  );

  function openCreate() {
    setEditing(undefined);
    setEditorOpen(true);
  }
  function openEdit(card: Card) {
    setEditing(card);
    setEditorOpen(true);
  }
  async function handleSubmit(input: CardInput) {
    if (editing) await updateM.mutateAsync({ id: editing.id, input });
    else await createM.mutateAsync(input);
  }
  async function handleDelete() {
    if (deleting) await deleteM.mutateAsync(deleting.id);
    setDeleting(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" className="gap-2" render={<Link href="/decks" />}>
          <ArrowLeft className="size-4" />
          {t("back")}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href={`/decks/${deckId}/study`} />}>
            {t("study")}
          </Button>
          <Button onClick={openCreate}>{t("new")}</Button>
        </div>
      </div>

      {!isLoading && !error && (cards?.length ?? 0) > 0 && (
        <StatusFilterBar value={filter} counts={counts} onChange={setFilter} />
      )}

      {isLoading && (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{t("errors.loadFailed")}</p>}

      {!isLoading && !error && (cards?.length ?? 0) === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <h2 className="text-lg font-semibold">{t("empty.title")}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">{t("empty.description")}</p>
          <Button onClick={openCreate}>{t("empty.cta")}</Button>
        </div>
      )}

      {!isLoading && !error && (cards?.length ?? 0) > 0 && (
        <div className="grid gap-3">
          {visible.map((c) => (
            <CardRow key={c.id} card={c} onEdit={openEdit} onDelete={setDeleting} />
          ))}
        </div>
      )}

      <CardEditorDialog open={editorOpen} onOpenChange={setEditorOpen} card={editing} onSubmit={handleSubmit} />
      <DeleteCardDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)} onConfirm={handleDelete} />
    </div>
  );
}
```

- [ ] **Step 6: Build va typecheck**

Run: `npx pnpm exec tsc --noEmit`
Expected: xatosiz. (`Button` `render` prop mavjudligini `deck-card.tsx` tasdiqlaydi — Base UI naqsh.)

- [ ] **Step 7: Commit**

```bash
git add "src/app/decks/[deckId]"
git commit -m "feat: deck detail page with status filters and card CRUD"
```

---

## Task 12: Deck list — haqiqiy karta soni + detalga link + menyu bug tekshirish

**Files:**
- Modify: `src/app/decks/_components/deck-card.tsx`

**Interfaces:**
- Consumes: `useDeckCardCount`, `Link`.
- Produces: `DeckCard` — haqiqiy karta soni; sarlavha/tana `/decks/[id]`ga link; ⋯ menyu ishlaydi.

- [ ] **Step 1: `deck-card.tsx` ni yangilash**

Butun faylni almashtiring:

```tsx
"use client";

import Link from "next/link";
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
import { useDeckCardCount } from "@/lib/pb/card-queries";
import type { Deck } from "@/lib/deck-types";

type Props = {
  deck: Deck;
  onEdit: (deck: Deck) => void;
  onDelete: (deck: Deck) => void;
};

export function DeckCard({ deck, onEdit, onDelete }: Props) {
  const t = useTranslations("decks");
  const { data: count } = useDeckCardCount(deck.id);
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className={cn("size-4 shrink-0 rounded-full", deckColorClasses[deck.color])} />
          <Link href={`/decks/${deck.id}`} className="min-w-0 flex-1">
            <CardTitle className="truncate hover:underline">{deck.name}</CardTitle>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="size-11" aria-label={t("menu.open")}>
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
        <p className="text-xs text-muted-foreground">{t("cardCount", { count: count ?? 0 })}</p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Menyu bug'ini brauzerda tekshirish**

Run: `npx pnpm dev` (yoki mavjud deploy)
Qo'lda: `/decks` sahifasida deck kartadagi ⋯ tugmani bosing — menyu ochilishi va "Tahrirlash"/"O'chirish" ko'rinishi kerak.
- **Agar ochilmasa:** Base UI `DropdownMenuTrigger` `render` prop naqshini tekshiring. Ehtimoliy tuzatish — trigger'ni bola sifatida berish:
  ```tsx
  <DropdownMenuTrigger
    className="ml-auto"
    render={(props) => (
      <Button {...props} variant="ghost" size="icon" className="size-11" aria-label={t("menu.open")}>
        <MoreVertical className="size-5" />
      </Button>
    )}
  />
  ```
  `node_modules/@base-ui/react` Menu.Trigger `render` API'sini o'qib to'g'ri naqshni qo'llang (memory: Base UI render prop quirk). Bir marta tuzatilsa, `card-row.tsx`dagi bir xil naqshga ham qo'llang.
Expected: ⋯ menyu ochiladi; Tahrirlash dialog ochadi; O'chirish tasdiq dialogini ochadi.

- [ ] **Step 3: Commit**

```bash
git add src/app/decks/_components/deck-card.tsx
git commit -m "feat: deck card shows real count, links to detail, menu verified"
```

---

## Task 13: Study oqimi

**Files:**
- Create: `src/app/decks/[deckId]/study/page.tsx`
- Create: `src/app/decks/[deckId]/study/_components/study-client.tsx`
- Create: `src/app/decks/[deckId]/study/_components/study-card.tsx`

**Interfaces:**
- Consumes: `useCards`, `useGradeCard`, `Card`, `Grade`, `AuthGuard`, i18n.
- Produces: `/decks/[deckId]/study` — aralashtirilgan navbat, flip, 3 baho, "Qiyin" qayta ko'rsatish, sessiya xulosasi.

- [ ] **Step 1: `study/page.tsx`**

```tsx
import { AuthGuard } from "@/components/auth/auth-guard";
import { StudyClient } from "./_components/study-client";

export default async function StudyPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = await params;
  return (
    <AuthGuard>
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-6 py-6">
        <StudyClient deckId={deckId} />
      </div>
    </AuthGuard>
  );
}
```

- [ ] **Step 2: `study-card.tsx`**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card as UiCard, CardContent } from "@/components/ui/card";
import type { Card, CardSide } from "@/lib/card-types";

function SideView({ side }: { side: CardSide }) {
  return (
    <div className="flex flex-col items-center gap-3">
      {side.text && <p className="text-center text-lg">{side.text}</p>}
      {side.image && (
        // eslint-disable-next-line @next/next/no-img-element -- PB URL
        <img src={side.image} alt="" className="max-h-48 rounded-lg object-contain" />
      )}
      {side.audio && <audio src={side.audio} controls />}
    </div>
  );
}

export function StudyCard({
  card,
  flipped,
  onFlip,
  onGrade,
}: {
  card: Card;
  flipped: boolean;
  onFlip: () => void;
  onGrade: (grade: "hard" | "medium" | "easy") => void;
}) {
  const t = useTranslations("study");
  return (
    <div className="flex flex-col gap-4">
      <UiCard className="min-h-56 rounded-2xl">
        <CardContent className="flex min-h-56 flex-col items-center justify-center gap-6 py-8">
          {card.icon && <span className="text-3xl">{card.icon}</span>}
          <SideView side={card.front} />
          {flipped && (
            <>
              <hr className="w-full border-border" />
              <SideView side={card.back} />
            </>
          )}
        </CardContent>
      </UiCard>

      {!flipped ? (
        <Button className="min-h-12" onClick={onFlip}>
          {t("showAnswer")}
        </Button>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" className="min-h-12" onClick={() => onGrade("hard")}>
            {t("hard")}
          </Button>
          <Button variant="outline" className="min-h-12" onClick={() => onGrade("medium")}>
            {t("medium")}
          </Button>
          <Button variant="outline" className="min-h-12" onClick={() => onGrade("easy")}>
            {t("easy")}
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: `study-client.tsx`**

Navbat: kartalar yuklanganda bir marta aralashtiriladi (`useState` initializer emas — `useEffect` bilan yuklangach). "Qiyin" baholangan karta navbat oxiriga bir marta qo'shiladi (`requeued` Set bilan takror oldini oladi).

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useCards, useGradeCard } from "@/lib/pb/card-queries";
import type { Card, Grade } from "@/lib/card-types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function StudyClient({ deckId }: { deckId: string }) {
  const t = useTranslations("study");
  const { data: cards, isLoading } = useCards(deckId);
  const gradeM = useGradeCard(deckId);

  const [queue, setQueue] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [requeued, setRequeued] = useState<Set<string>>(new Set());
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kartalar yuklanганда navbatni bir marta aralashtirib boshlash.
  useEffect(() => {
    if (!started && cards && cards.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- init on data load
      setQueue(shuffle(cards));
      setStarted(true);
    }
  }, [cards, started]);

  if (isLoading || (!started && (cards?.length ?? 0) > 0)) {
    return <div className="h-56 animate-pulse rounded-2xl bg-muted" />;
  }

  if ((cards?.length ?? 0) === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-muted-foreground">{t("empty")}</p>
        <Button render={<Link href={`/decks/${deckId}`} />}>{t("summary.backToDeck")}</Button>
      </div>
    );
  }

  const done = index >= queue.length;
  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <h2 className="text-xl font-semibold">{t("summary.title")}</h2>
        <p className="text-muted-foreground">{t("summary.reviewed", { count: reviewed })}</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setQueue(shuffle(cards ?? []));
              setIndex(0);
              setReviewed(0);
              setRequeued(new Set());
              setFlipped(false);
            }}
          >
            {t("summary.again")}
          </Button>
          <Button render={<Link href={`/decks/${deckId}`} />}>{t("summary.backToDeck")}</Button>
        </div>
      </div>
    );
  }

  const current = queue[index];

  async function grade(g: Grade) {
    setError(null);
    try {
      await gradeM.mutateAsync({
        cardId: current.id,
        current: current.status,
        easyStreak: current.easyStreak,
        grade: g,
      });
    } catch {
      return setError(t("gradeFailed"));
    }
    setReviewed((n) => n + 1);
    // "Qiyin" bo'lsa va hali qayta qo'yilmagan bo'lsa — navbat oxiriga qo'shish.
    if (g === "hard" && !requeued.has(current.id)) {
      setQueue((q) => [...q, current]);
      setRequeued((s) => new Set(s).add(current.id));
    }
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-sm text-muted-foreground">
        {t("progress", { done: reviewed, total: queue.length })}
      </p>
      {error && <p className="text-center text-sm text-destructive">{error}</p>}
      <StudyCardInline card={current} flipped={flipped} onFlip={() => setFlipped(true)} onGrade={grade} />
    </div>
  );
}

// Task 13 Step 2'dagi StudyCard'ni import qilish o'rniga to'g'ridan re-export:
import { StudyCard as StudyCardInline } from "./study-card";
```

> Not: yuqoridagi oxirgi `import` faylning **boshiga** ko'chiring (barcha importlar tepada). Bu yerda ko'rsatilishi shunchaki `StudyCard` ishlatilishini bildiradi.

- [ ] **Step 4: `import` ni tartibga solish**

`study-client.tsx` da `import { StudyCard as StudyCardInline } from "./study-card";` ni fayl boshidagi importlar orasiga ko'chiring va oxiridagi qatorni o'chiring.

- [ ] **Step 5: Typecheck**

Run: `npx pnpm exec tsc --noEmit`
Expected: xatosiz.

- [ ] **Step 6: Commit**

```bash
git add "src/app/decks/[deckId]/study"
git commit -m "feat: study flow with flip, grading, hard-requeue, summary"
```

---

## Task 14: Analitika sahifasi + recharts

**Files:**
- Modify: `package.json` (recharts dep)
- Create: `src/app/analytics/page.tsx`
- Create: `src/app/analytics/_components/analytics-client.tsx`
- Create: `src/app/analytics/_components/stat-card.tsx`

**Interfaces:**
- Consumes: `useReviews`, `useDecks`, `analytics.ts` funksiyalari, `cardStatusHex`, recharts.
- Produces: `/analytics` — streak, KPI'lar, kunlik reviewlar (bar), aniqlik (line), holat taqsimoti (donut).

- [ ] **Step 1: recharts o'rnatish**

Run: `npx pnpm add recharts`
Expected: `package.json` dependencies'ga `recharts` qo'shiladi; lockfile yangilanadi.

- [ ] **Step 2: `stat-card.tsx`**

```tsx
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex flex-col gap-1 py-4">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-2xl font-bold">{value}</span>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: `analytics-client.tsx`**

Analitika barcha decklar kartalaridan holat taqsimotini oladi. Kartalarni barcha decklar bo'yicha yig'ish uchun `listCards`ni har deck uchun chaqirish o'rniga — soddalik uchun holat taqsimotini `useReviews`dan emas, balki alohida `useAllCards` bilan olamiz. Buning uchun kichik helper qo'shamiz.

Avval `src/lib/pb/cards.ts` ga qo'shing:

```ts
export async function listAllCards(): Promise<Card[]> {
  const records = await pb.collection(COL).getFullList({ sort: "-updated" });
  return records.map(mapRecordToCard);
}
```

Va `src/lib/pb/card-queries.ts` ga:

```ts
import { /* mavjudlar */, listAllCards } from "@/lib/pb/cards";

export function useAllCards() {
  return useQuery({ queryKey: ["cards", "all"], queryFn: listAllCards });
}
```

> Diqqat: `["cards","all"]` kaliti `useCards(deckId)` (`["cards", deckId]`) bilan to'qnashmaydi, chunki `deckId` hech qachon `"all"` emas (PB id'lar). `useInvalidate` `["cards", deckId]`ni invalidatsiya qiladi, `["cards","all"]`ni emas — shuning uchun `useGradeCard` va boshqalar `useAllCards`ni ham invalidatsiya qilishi uchun `useInvalidate`ga `qc.invalidateQueries({ queryKey: ["cards"] })` qo'shing (butun `cards` prefiksi). `useInvalidate` ichidagi `["cards", deckId]` qatorini `["cards"]` bilan almashtiring.

Keyin `analytics-client.tsx`:

```tsx
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
```

- [ ] **Step 4: `analytics/page.tsx`**

```tsx
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
```

- [ ] **Step 5: Apply the `useInvalidate` va `useAllCards` o'zgarishlari (Step 3 eslatmasi)**

`src/lib/pb/card-queries.ts` `useInvalidate` ichida `qc.invalidateQueries({ queryKey: ["cards", deckId] })` ni `qc.invalidateQueries({ queryKey: ["cards"] })` bilan almashtiring; `listAllCards`/`useAllCards` qo'shilganini tasdiqlang; `src/lib/pb/cards.ts` `listAllCards` export qilinganini tasdiqlang.

- [ ] **Step 6: Build**

Run: `npx pnpm build`
Expected: xatosiz (`--webpack`). recharts SSR'da ResponsiveContainer client-only — `"use client"` bor, muammo yo'q.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml src/app/analytics src/lib/pb/cards.ts src/lib/pb/card-queries.ts
git commit -m "feat: analytics page with streak, daily reviews, accuracy, distribution (recharts)"
```

---

## Task 15: Navigatsiya — Decklar / Analitika havolalari

**Files:**
- Modify: `src/app/decks/_components/decks-header.tsx`

**Interfaces:**
- Produces: header'da `/decks` va `/analytics` havolalari.

- [ ] **Step 1: `decks-header.tsx` ga navigatsiya qo'shish**

`<span className="text-sm text-muted-foreground">{user?.email}</span>` ni quyidagicha almashtiring (chap tomonda nav havolalar):

```tsx
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
```

Fayl boshiga qo'shing:

```tsx
import Link from "next/link";
```

Va `useTranslations` chaqiruvlari orasiga:

```tsx
  const tNav = useTranslations("nav");
```

- [ ] **Step 2: Build/typecheck**

Run: `npx pnpm exec tsc --noEmit`
Expected: xatosiz.

- [ ] **Step 3: Commit**

```bash
git add src/app/decks/_components/decks-header.tsx
git commit -m "feat: header nav links to decks and analytics"
```

---

## Task 16: E2E test (jonli PB)

**Files:**
- Create: `e2e/cards.spec.ts`

**Interfaces:**
- Consumes: mavjud e2e auth helperlari (`e2e/` dagi login naqshini takrorlang — mavjud `auth`/`deck` spec'larига qarang).

- [ ] **Step 1: Mavjud e2e naqshini o'qish**

Run: `ls e2e && sed -n '1,60p' e2e/*.spec.ts`
Expected: mavjud login/deck yaratish helperlarini ko'rasiz (register/login qadamlari, base URL). Yangi testda shu naqshni ishlatib: login → deck yaratish (yoki mavjudini ochish).

- [ ] **Step 2: `e2e/cards.spec.ts` yozish**

Mavjud spec'lardagi login helper'iga moslashtiring (bu yerda umumiy skelet — selektorlarni mavjud UI matniga (`uz.json`) qarab moslang):

```ts
import { test, expect } from "@playwright/test";

// NOTE: mavjud e2e/auth.spec.ts dagi login naqshiga moslang (email/parol, base URL).
test("card lifecycle: create, filter, study, delete", async ({ page }) => {
  // --- login (mavjud helper naqshi) ---
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.E2E_EMAIL ?? "test@ilmify.dev");
  await page.getByLabel("Parol").fill(process.env.E2E_PASSWORD ?? "test123456");
  await page.getByRole("button", { name: "Kirish" }).click();
  await expect(page).toHaveURL(/\/decks/);

  // --- deck yaratish ---
  await page.getByRole("button", { name: "Yangi deck" }).click();
  const deckName = `E2E ${Date.now()}`;
  await page.getByLabel("Nom").fill(deckName);
  await page.getByRole("button", { name: "Yaratish" }).click();
  await page.getByText(deckName).click();
  await expect(page).toHaveURL(/\/decks\/.+/);

  // --- karta yaratish ---
  await page.getByRole("button", { name: "Yangi karta" }).click();
  await page.getByLabel("Old tomon").fill("Apple");
  await page.getByLabel("Orqa tomon").fill("Olma");
  await page.getByRole("button", { name: "Yaratish" }).click();
  await expect(page.getByText("Apple")).toBeVisible();

  // --- filtr: Yangi (1) ---
  await expect(page.getByRole("button", { name: /Yangi \(1\)/ })).toBeVisible();

  // --- study: baho ber ---
  await page.getByRole("button", { name: "O'rganish" }).click();
  await page.getByRole("button", { name: "Javobni ko'rish" }).click();
  await page.getByRole("button", { name: "Oson" }).click();
  await expect(page.getByText(/Sessiya tugadi|1 karta/)).toBeVisible();

  // --- deck'ga qaytish: status Oson'ga o'zgargan ---
  await page.getByRole("button", { name: "Deck'ga qaytish" }).click();
  await expect(page.getByRole("button", { name: /Oson \(1\)/ })).toBeVisible();

  // --- analitika: streak ko'rinadi ---
  await page.getByRole("link", { name: "Analitika" }).click();
  await expect(page.getByText("Ketma-ket kunlar")).toBeVisible();
});
```

- [ ] **Step 3: E2E ishga tushirish**

Run: `npx pnpm test:e2e -- cards`
Expected: PASS. Agar selektor topilmasa — mavjud UI matni (`uz.json`) va e2e login naqshiga moslab tuzating. Live PB kerak (`.env.local`).

- [ ] **Step 4: Commit**

```bash
git add e2e/cards.spec.ts
git commit -m "test: e2e card lifecycle, study grading, analytics"
```

---

## Task 17: Yakuniy tekshirish

- [ ] **Step 1: Barcha unit testlar**

Run: `npx pnpm test`
Expected: barcha suite yashil (card-types, card-status, analytics, mavjud deck/i18n/utils).

- [ ] **Step 2: Lint**

Run: `npx pnpm lint`
Expected: xatosiz (yoki faqat oldindan mavjud ogohlantirishlar).

- [ ] **Step 3: Build**

Run: `npx pnpm build`
Expected: `--webpack` bilan xatosiz.

- [ ] **Step 4: Qo'lda smoke (dev)**

Run: `npx pnpm dev`
Qo'lda tekshiring: deck ⋯ menyu ochiladi → tahrirlash/o'chirish; deck ochish → karta yaratish (rasm+emoji) → filtr → O'rganish → baho → deck'da status yangilandi → Analitika grafiklari.

- [ ] **Step 5: Yakuniy commit (agar qoldiq bo'lsa)**

```bash
git add -A
git commit -m "chore: final verification for cards/media/study/analytics" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage:**
- §2 PWA icon → Task 1 ✅
- §3 ma'lumot modeli → Task 3 ✅
- §4 PB kolleksiyalar → Task 2 ✅
- §5 sof mantiq (card-status, analytics) → Task 4, 5 ✅
- §6 repository + hooks → Task 6, 7 ✅
- §7 UI (deck detail, editor, media, filtr) → Task 9, 10, 11, 12 ✅
- §8 study → Task 13 ✅
- §9 analitika → Task 14 ✅
- §10 deck edit/delete bug → Task 12 ✅
- nav → Task 15 ✅
- §12 testlar → Task 4,5,3 (unit) + Task 16 (e2e) ✅
- §13 recharts → Task 14 ✅

**Type consistency:** `nextStatus`, `gradeCard` args, `CardInput`/`CardSideInput`, `MediaValue`, `StatusFilter`, `cardStatusMeta`/`cardStatusHex` barcha tasklarda izchil. `useInvalidate` `["cards"]` prefiksiga o'zgartirilib (Task 14 Step 5) `useAllCards` ham yangilanadi.

**Placeholder scan:** Har kod qadamida to'liq kod bor; xato holatlar aniq (`errors.*` kalitlar). Task 12 Step 2 va Task 16'da "agar bug bo'lsa/selektor moslash" — bular verifikatsiya/moslash qadamlari, placeholder emas.
