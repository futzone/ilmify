# Ilmify — Backend & Auth (PocketBase migratsiyasi) Dizayn Spec

- **Sana:** 2026-07-03
- **Slice:** Backend & Auth — PocketBase'ga ulanish, autentifikatsiya, deck CRUD migratsiyasi
- **Holat:** Tasdiqlangan (dizayn)
- **Oldingi:** [M1′ Deck CRUD](2026-07-03-ilmify-m1-decks-design.md) — tugallandi (local Dexie)
- **Sabab:** Foydalanuvchi backend'ni hozir ulashni so'radi; bu M0'dagi "local-only, auth M6'ga" qarorini bekor qiladi va M2'dan oldin bajariladi.

## 1. Kontekst va maqsad

M1′ deck CRUD'ni Dexie (IndexedDB, local-only) da yetkazdi. Endi foydalanuvchi **PocketBase backend + autentifikatsiya**ni hozir ulashni xohlaydi. Ushbu slice ma'lumot qatlamini **PocketBase (cloud, per-user, online-first)** ga ko'chiradi va email/parol auth qo'shadi. M2 (kartalar) shundan keyin PocketBase ustida quriladi.

Brainstorming qarorlari:
- **Manba:** PocketBase online-first, per-user. Local Dexie tashlanadi (offline kesh keyingi sync-milestone'ga).
- **Reaktivlik:** TanStack Query (useLiveQuery o'rniga).
- **Kolleksiya nomlari:** `ilmify_` prefiks (mavjud kolleksiyalar bilan to'qnashmaslik uchun).
- **Ketma-ketlik:** Bu slice avval, keyin M2.

## 2. PocketBase muhiti

- URL: `https://admin.imlogo.uz` (jonli PocketBase v0.23+, health OK).
- Mavjud kolleksiyalar (**TEGILMAYDI**): `users` (auth), `dictations`, `app`, va tizim (`_superusers`, `_mfas`, ...).
- Yangi kolleksiyalar `ilmify_` prefiks bilan — to'qnashuv yo'q (tekshirilgan).
- Superadmin creds faqat `.env.local` (gitignore) + setup skriptida; commit qilinmaydi.

## 3. PocketBase kolleksiyalar (yangi)

### `ilmify_users` (auth collection)
- Standart auth maydonlari (email, password, tokenKey, verified) + `name` (text, ixtiyoriy).
- **Auth:** email/parol yoqilgan. **Verifikatsiya talab qilinmaydi** (auto-confirm) — ro'yxatdan o'tgan foydalanuvchi darhol kira oladi.
- Mavjud `users` kolleksiyasidan alohida (izolyatsiya).

### `ilmify_decks` (base collection)
| Maydon | Tur | Izoh |
|--------|-----|------|
| name | text | required, max 60 |
| description | text | ixtiyoriy |
| color | select (single) | 8 qiymat: purple, blue, green, amber, red, pink, teal, slate |
| owner | relation → ilmify_users | required, single |

**API rules (barcha: list, view, create, update, delete):**
`@request.auth.id != "" && owner = @request.auth.id`
(create uchun: yaratishda `owner` mijoz tomonidan auth id ga o'rnatiladi; qo'shimcha create rule owner = auth id ni ta'minlaydi.)

- `ilmify_notes`, `ilmify_cards` — **M2'da** yaratiladi (bu slice'da emas).

**Setup:** `scripts/pb-setup.mjs` — Node skript, superadmin bilan auth qilib kolleksiyalarni **idempotent** yaratadi (mavjud bo'lsa o'tkazib yuboradi). Creds env'dan: `PB_SUPERUSER_EMAIL`, `PB_SUPERUSER_PASSWORD`, `PB_URL`.

## 4. Ilova arxitekturasi

### PocketBase client
- `src/lib/pb/client.ts` — singleton `PocketBase` instance, `NEXT_PUBLIC_POCKETBASE_URL`. Token authStore'da (localStorage), sahifa yangilanishida saqlanadi.

### Auth
- `src/lib/pb/auth.ts` — sof/yupqa o'ramlar:
  - `register(input: { email, password, passwordConfirm, name? }): Promise<void>` — `ilmify_users` da record yaratadi, so'ng login qiladi.
  - `login(email, password): Promise<void>`
  - `logout(): void`
  - `getCurrentUser(): AuthUser | null`
- `src/components/auth/auth-provider.tsx` — client context: `pb.authStore` holatini kuzatadi (`onChange`), `{ user, isLoading }` beradi.
- `src/components/auth/auth-guard.tsx` — himoyalangan sahifalar uchun: `isLoading` bo'lsa spinner; auth yo'q bo'lsa `/login`ga `router.replace`.

### Sahifalar
- `/login` — email/parol formasi → `login` → `/decks`.
- `/register` — email/parol/tasdiq/name → `register` → `/decks`.
- Ochiq sahifalar: `/`, `/login`, `/register`. Himoyalangan: `/decks` (va keyingi ilova).
- Landing `/` — agar allaqachon auth bo'lsa "Boshlash" `/decks`ga; aks holda `/login`ga (yoki register). Minimal: "Boshlash" → `/decks` (AuthGuard login'ga yo'naltiradi).

### Server-state (TanStack Query)
- `src/components/query-provider.tsx` — `QueryClientProvider`, layout'da (NextIntl/Theme yonида).
- `src/lib/pb/decks.ts` — PocketBase deck repository:
  - `listDecks(): Promise<Deck[]>` — `pb.collection("ilmify_decks").getFullList({ sort: "-updated" })`.
  - `createDeck(input): Promise<Deck>` — owner = joriy auth id.
  - `updateDeck(id, input): Promise<Deck>`
  - `deleteDeck(id): Promise<void>`
  - `mapRecordToDeck(record): Deck` — sof mapping funksiya (test qilinadi).
- `src/lib/pb/deck-queries.ts` — TanStack hooks: `useDecks()`, `useCreateDeck()`, `useUpdateDeck()`, `useDeleteDeck()` (mutation'lar `["decks"]` ni invalidatsiya qiladi).

### Header
- Joriy foydalanuvchi email/name + "Chiqish" tugmasi (logout → `/login`).

## 5. Ma'lumot modeli o'zgarishi

```ts
type Deck = {
  id: string;            // PB 15-belgili record id
  name: string;
  description: string;
  color: DeckColor;
  owner: string;         // ilmify_users record id
  created: string;       // PB ISO timestamp
  updated: string;       // PB ISO timestamp
};

type DeckInput = { name; description?; color };  // zod, M1'dan qayta ishlatiladi
```
- `DeckColor`, `deckInputSchema`, `deckColorClasses` M1'dan saqlanadi (`src/lib/db/types.ts` → `src/lib/deck-types.ts` ga ko'chiriladi, "db" nomi Dexie'ni anglatgani uchun).
- Eski `parentId`/`createdAt`/`updatedAt` (raqamli) → PB `created`/`updated` (ISO string). `parentId` hozircha olib tashlanadi (nesting keyin, PB relation bilan qo'shiladi).

## 6. Olib tashlanadigan / o'zgaradigan (M1 Dexie kodi)

- **O'chiriladi:** `src/lib/db/db.ts`, `src/lib/db/decks.ts`, `src/lib/db/decks.test.ts`, `dexie`/`dexie-react-hooks`/`fake-indexeddb` bog'liqliklari.
- **Ko'chiriladi/saqlanadi:** `src/lib/db/types.ts` → `src/lib/deck-types.ts` (Deck tipi PB'ga moslashtirilgan, zod saqlanadi), `types.test.ts` mos ravishda ko'chiriladi. `src/lib/deck-colors.ts` o'zgarishsiz.
- **Yangilanadi:** `deck-list.tsx`, `deck-card.tsx`, `decks-client.tsx`, `deck-form-dialog.tsx`, `delete-deck-dialog.tsx` — TanStack Query hook'lariga o'tadi (Dexie import'lari olib tashlanadi).

## 7. Xatolar va chekka holatlar

- **Auth xatolari:** noto'g'ri login/parol → forma inline xato ("Email yoki parol noto'g'ri"). Ro'yxatda dublikat email → "Bu email band".
- **Tarmoq xatolari:** query/mutation xatosi → foydalanuvchiga ko'rinadigan xato holati (toast yoki inline), jimgina yutilmaydi.
- **Auth muddati tugashi:** token yaroqsiz bo'lsa (401) → AuthGuard `/login`ga yo'naltiradi.
- **SSR:** PB auth client-side; himoyalangan sahifalar mount'gacha loading ko'rsatadi, so'ng auth tekshiradi (hydration-xavfsiz).
- **Bo'sh/60+ nom:** zod + forma validatsiyasi (M1'dagi kabi).

## 8. Test strategiyasi

- **Unit (Vitest):** `deckInputSchema` validatsiya (M1'dan), `mapRecordToDeck` sof mapping.
- **Integratsiya/E2E (Playwright, jonli PB):** ro'yxatdan o'tish → login → deck yaratish/tahrirlash/o'chirish → chiqish → qayta kirish. Test foydalanuvchi noyob email bilan (masalan `test+<timestamp>@ilmify.test`) yaratiladi.
- PB repository/auth funksiyalari jonli PB'ga tegani uchun sof unit-test qilinmaydi; E2E asosiy tasdiqdir.

## 9. Env va konfiguratsiya

- `.env.local` (gitignore): `NEXT_PUBLIC_POCKETBASE_URL=https://admin.imlogo.uz`, `PB_SUPERUSER_EMAIL`, `PB_SUPERUSER_PASSWORD` (faqat setup skript uchun).
- `.env.example` (commit): o'zgaruvchi nomlari (qiymatlarsiz), hujjat sifatida.
- `NEXT_PUBLIC_POCKETBASE_URL` bundle'ga tushadi (public, muammo emas). Superadmin creds hech qachon `NEXT_PUBLIC_` emas va bundle'ga tushmaydi.

## 10. Ko'lam tashqarisi (bu slice emas)

- Notes/Cards kolleksiyalari va CRUD (M2).
- OAuth (Google), parolni tiklash, email verifikatsiya oqimi.
- Offline kesh / sync (keyingi milestone).
- Deck nesting (parentId), teglar.
- PB realtime subscriptions (keyin TanStack Query ustiga).

## 11. Definition of Done

1. `ilmify_users` + `ilmify_decks` kolleksiyalari PB'da yaratilgan (setup skript orqali, idempotent), owner-based rules bilan. Mavjud kolleksiyalar tegilmagan.
2. Ro'yxatdan o'tish / kirish / chiqish ishlaydi (email/parol, auto-confirm).
3. Autentifikatsiyasiz foydalanuvchi `/decks`da `/login`ga yo'naltiriladi.
4. Deck CRUD PocketBase orqali ishlaydi (per-user; boshqa foydalanuvchi decklari ko'rinmaydi).
5. `useLiveQuery` butunlay TanStack Query bilan almashtirilgan; Dexie bog'liqliklari olib tashlangan.
6. Unit-testlar (zod, mapping) yashil; Playwright E2E (register→CRUD→logout→login) o'tadi.
7. Superadmin creds repo'da yo'q; `.env.local` gitignore'da; `.env.example` commit qilingan.
8. TypeScript strict; `pnpm build` xatosiz.
