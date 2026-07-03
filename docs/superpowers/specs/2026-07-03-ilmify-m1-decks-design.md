# Ilmify — M1′ (Local Data Layer + Deck CRUD) Dizayn Spec

- **Sana:** 2026-07-03
- **Milestone:** M1′ — Local ma'lumot qatlami + Deck CRUD (auth'siz, local-only)
- **Holat:** Tasdiqlangan (dizayn)
- **Oldingi:** [M0 Skelet](2026-07-02-ilmify-m0-skeleton-design.md) — tugallandi

## 1. Kontekst va maqsad

M0 skeletni yetkazdi (Next.js 16, Tailwind v4, shadcn/Base UI, next-intl `uz`, theme, PWA, Vitest). M1′ birinchi funksional qatlamni qo'shadi: **brauzerda (IndexedDB, Dexie) yashaydigan deck'lar** va ular ustidan to'liq CRUD. Auth va cloud sync kechiktirilgan (local-only qaror, M0 spec'ga qarang).

Bu milestone keyingi barcha ma'lumotli ishlar (Note, Card, FSRS) uchun poydevor — shuning uchun ma'lumot qatlami toza va test qilingan bo'lishi shart.

## 2. Brainstorming qarorlari

- **Deck tuzilishi:** Tekis (flat). Schema'da `parentId` maydoni bor (kelajakka tayyor), lekin nesting UI M1′ da yo'q.
- **Deck maydonlari:** `name` + `description` + `color` (vizual identifikatsiya uchun palitradan).
- **Reaktivlik:** `dexie-react-hooks` ning `useLiveQuery` — alohida Zustand store data uchun ishlatilmaydi.
- **Validatsiya:** `zod` (`DeckInput` schema).
- **Test:** `fake-indexeddb` + Vitest, repository funksiyalari uchun.

## 3. Ma'lumot modeli

```ts
type Deck = {
  id: string;            // crypto.randomUUID()
  name: string;          // 1–60 belgi
  description: string;   // ixtiyoriy, default ""
  color: DeckColor;      // oldindan belgilangan palitradan
  parentId: string | null; // hozircha har doim null (nesting keyin)
  createdAt: number;     // Date.now()
  updatedAt: number;     // Date.now()
};

type DeckInput = {       // create/update uchun (zod bilan validatsiya)
  name: string;          // trim, 1–60
  description?: string;
  color: DeckColor;
};

type DeckColor = // brend-do'st palitra kalitlari
  "purple" | "blue" | "green" | "amber" | "red" | "pink" | "teal" | "slate";
```

- Palitra CSS o'zgaruvchi/klass sifatida `globals.css` yoki markaziy `deck-colors.ts` da; har rang light/dark uchun mos.
- `parentId` schema'da mavjud, lekin M1′ da faqat `null` yoziladi.

## 4. Fayl tuzilishi

```
src/lib/db/
├── db.ts            # Dexie instance + schema (version 1: decks)
├── types.ts         # Deck, DeckColor, DeckInput + zod schema
├── decks.ts         # repository: create/list/get/update/delete
└── decks.test.ts    # fake-indexeddb bilan unit-testlar
src/lib/deck-colors.ts   # DeckColor → Tailwind klass/hex xaritasi
src/app/decks/
├── page.tsx         # deck ro'yxati sahifasi
└── _components/
    ├── deck-list.tsx        # grid + empty/loading holatlar (useLiveQuery)
    ├── deck-card.tsx        # bitta deck kartasi + ⋯ menyu
    ├── deck-form-dialog.tsx # create/edit dialog (shadcn Dialog)
    └── delete-deck-dialog.tsx # o'chirish tasdiqi (AlertDialog)
```

Yangi shadcn komponentlari: `dialog`, `alert-dialog`, `input`, `textarea`, `label`.

## 5. Repository interfeysi (`src/lib/db/decks.ts`)

```ts
createDeck(input: DeckInput): Promise<Deck>       // validatsiya + id/vaqt to'ldirish
listDecks(): Promise<Deck[]>                       // updatedAt desc bo'yicha
getDeck(id: string): Promise<Deck | undefined>
updateDeck(id: string, input: DeckInput): Promise<Deck>  // updatedAt yangilanadi
deleteDeck(id: string): Promise<void>
```

- Har funksiya `DeckInput` ni zod bilan validatsiya qiladi; nomos bo'lsa xato tashlaydi.
- `createDeck`/`updateDeck` `name` ni trim qiladi.
- `deleteDeck` mavjud bo'lmagan id'da jimgina o'tadi (idempotent).

## 6. UI oqimi

- **`/decks`** — `DeckList` `useLiveQuery(listDecks)` orqali jonli ro'yxatni ko'rsatadi.
  - **Loading:** `undefined` (hali yuklanmoqda) → skeleton grid.
  - **Empty:** `[]` → empty-state (matn + "Yangi deck" tugmasi).
  - **Data:** karta-grid; har karta rang-belgisi, nom, tavsif, karta soni (hozircha "0 karta"), ⋯ menyu (Tahrirlash / O'chirish).
- **Yaratish:** header'dagi "Yangi deck" tugmasi → `DeckFormDialog` (bo'sh). Submit → `createDeck` → dialog yopiladi, ro'yxat avtomatik yangilanadi.
- **Tahrirlash:** karta menyusidan → `DeckFormDialog` (deck bilan to'ldirilgan) → `updateDeck`.
- **O'chirish:** karta menyusidan → `DeleteDeckDialog` (AlertDialog) → tasdiqda `deleteDeck`.
- **Landing:** "Boshlash" tugmasi `/decks` ga link (`next/link`).
- Barcha matn `messages/uz.json` `decks` namespace'ida.

## 7. Xatolar va chekka holatlar

- Bo'sh/faqat-bo'shliq nom → forma submit'ni bloklaydi, inline xato ("Nom kiritilishi shart").
- 60 belgidan uzun nom → validatsiya rad etadi.
- IndexedDB mavjud bo'lmagan/bloklangan (masalan private rejim ba'zi brauzerlarda) → sahifa xato-holatini ko'rsatadi, qulamaydi.
- `useLiveQuery` SSR'da `undefined` qaytaradi → loading holati bilan ishlanadi (hydration-xavfsiz).

## 8. Testlar (haqiqiy TDD)

`src/lib/db/decks.test.ts` (`fake-indexeddb` bilan, har testda toza DB):
- `createDeck` deck qaytaradi, `id`/`createdAt`/`updatedAt` to'ldirilgan, `parentId===null`.
- yaratilgan deck `listDecks` da paydo bo'ladi.
- `listDecks` `updatedAt` desc bo'yicha tartiblaydi.
- `updateDeck` maydonlarni o'zgartiradi va `updatedAt` ni oshiradi, `createdAt` o'zgarmaydi.
- `deleteDeck` deck'ni olib tashlaydi; mavjud bo'lmagan id idempotent.
- validatsiya: bo'sh nom, 60+ nom, noto'g'ri color → xato.

UI komponentlari M1′ da unit-test qilinmaydi (mantiq repository'da); integratsiya testi keyingi milestone'larda.

## 9. Yangi bog'liqliklar

- `dexie`, `dexie-react-hooks`, `zod` (runtime)
- `fake-indexeddb` (dev)

## 10. Ko'lam tashqarisi (M1′ emas)

- Note/Card/ReviewLog jadvallari va CRUD (M2+).
- Subdeck nesting UI.
- Auth, cloud sync, `.ilm` import/export.
- Teglar, qidiruv, filtrlash.

## 11. Definition of Done

1. `src/lib/db/` — Dexie DB + deck repository, sof funksiyalar bilan.
2. `pnpm test` — repository testlari (fake-indexeddb) yashil.
3. `/decks` sahifasi: ro'yxat, empty, loading holatlari ishlaydi.
4. Deck yaratish / tahrirlash / o'chirish to'liq ishlaydi, ro'yxat jonli yangilanadi.
5. Deck rangi vizual ko'rinadi (light/dark).
6. Landing "Boshlash" → `/decks`.
7. Barcha yangi UI matni `uz.json` dan; hard-code yo'q.
8. TypeScript strict; `pnpm build` xatosiz.
```
