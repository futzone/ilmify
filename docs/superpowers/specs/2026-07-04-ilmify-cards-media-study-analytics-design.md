# Ilmify — Kartalar + Media + Study + Analitika Dizayn Spec

- **Sana:** 2026-07-04
- **Milestone:** M2+ (M2 notes/cards spec'ni **almashtiradi** — sodda front/back model)
- **Holat:** Tasdiqlangan (dizayn)
- **Oldingi:** [Backend & Auth](2026-07-03-ilmify-backend-auth-design.md) ✅, [M1 Decks](2026-07-03-ilmify-m1-decks-design.md) ✅
- **Almashtiradi:** [M2 Notes/Cards](2026-07-03-ilmify-m2-notes-cards-design.md) — Tiptap/cloze/notes abstraksiyasi o'rniga sodda front/back kartalar.

## 1. Kontekst va ko'lam

Foydalanuvchi ilovani deploy qilib test qildi. Aniqlangan kamchiliklar (bir bosqichda hal qilinadi):

1. **PWA icon** — hozir faqat to'q binafsha kvadrat, hech qanday belgi yo'q.
2. **Deck** — edit/delete kodi bor (⋯ menyu) lekin ehtimol ochilmayapti (bug); deck ichiga karta qo'shish yo'q.
3. **Flashcard** — front/back tamoyili; rasm + audio biriktirish; karta/deck ikonkasi (emoji).
4. **Analitika** — natijalar, o'sish/kamayish, statistika.
5. **Deck ichi filtrlar** — kartalarni holat bo'yicha filtrlash (yangi/qiyin/oson/yodlangan).

**Brainstorming qarorlari:**
- Ketma-ketlik: bitta katta spec/plan (foydalanuvchi tanlovi).
- Analitika manbai: **oddiy study oqimi + review tarixi** (FSRS emas).
- Media: rasm + audio (front/back ichida), karta/deck ikonkasi (emoji), matn. **Umumiy PDF/fayl yo'q.**
- Karta muharriri: **sodda strukturaviy front/back + media maydonlari** (Tiptap/cloze yo'q).
- Icon: binafsha gradient + oq **"I"** monogramma.
- Karta kategoriyasi: **study baholaridan avtomatik** (yangi → qiyin/oson → yodlangan).
- Grafik: **recharts**.
- Analitika joyi: alohida **/analytics** sahifasi (barcha decklar bo'yicha umumiy).

## 2. PWA Icon

`scripts/gen-icons.cjs` yangilanadi:
- To'q binafsha to'ldirish o'rniga **binafsha gradient (#7c3aed → #5b21b6)** fon + markazda oq **"I"** monogramma.
- SVG shakl → PNG raster (192, 512). Maskable-512 uchun xavfsiz zona (belgi markazda ~60%).
- Amalga oshirish: SVG string yaratib PNG render — hozirgi qo'lda PNG yozuvchi kengaytiriladi (gradient + "I" shakl chizish) yoki `sharp` orqali SVG→PNG. Agar murakkab bo'lsa, oldindan render qilingan PNG'lar `public/icons/`ga qo'yiladi.
- `manifest.ts` o'zgarmaydi (yo'llar bir xil); `layout.tsx`ga `apple-touch-icon` qo'shiladi.

**DoD:** O'rnatilgan PWA ikonkasi oq "I" bilan binafsha gradient ko'rsatadi (bo'sh rang emas).

## 3. Ma'lumot modeli (app)

```ts
type CardStatus = "new" | "hard" | "easy" | "memorized";
type Grade = "hard" | "medium" | "easy";

type CardSide = {
  text: string;
  image?: string;   // PB fayl nomi (yo'q bo'lsa undefined)
  audio?: string;   // PB fayl nomi
};

type Card = {
  id: string;
  deck: string;
  front: CardSide;
  back: CardSide;
  icon: string;              // emoji, masalan "📘"; bo'sh bo'lishi mumkin
  status: CardStatus;
  easyStreak: number;        // ketma-ket "Oson" soni
  lastReviewed: string | null;
  owner: string;
  created: string;
  updated: string;
};

type CardInput = {           // zod
  front: { text: string; image?: File | string | null; audio?: File | string | null };
  back: { text: string; image?: File | string | null; audio?: File | string | null };
  icon?: string;
};

type Review = {
  id: string;
  card: string;
  deck: string;
  grade: Grade;
  owner: string;
  created: string;
};
```

### Status o'tish qoidalari (sof funksiya)
`nextStatus(current: CardStatus, easyStreak: number, grade: Grade): { status, easyStreak }`:
- `grade = "hard"` → `{ status: "hard", easyStreak: 0 }`
- `grade = "medium"` → `{ status: (current === "new" ? "hard" : current), easyStreak: 0 }` — streak uziladi, holat saqlanadi (yangi bo'lsa "hard"ga o'tadi, chunki ko'rildi).
- `grade = "easy"` → `easyStreak + 1`; agar `>= 3` → `{ status: "memorized", easyStreak: 3 }`, aks holda `{ status: "easy", easyStreak: easyStreak+1 }`.

## 4. PocketBase kolleksiyalar

`scripts/pb-setup.mjs`ga qo'shiladi — **idempotent** (mavjudlarga tegilmaydi). Owner RLS barchada: `@request.auth.id != "" && owner = @request.auth.id`.

### `ilmify_cards` (base)
| Maydon | Tur | Izoh |
|--------|-----|------|
| deck | relation → ilmify_decks | required, single, **cascadeDelete** |
| frontText | text | ixtiyoriy |
| frontImage | file | single, image (maxSelect 1) |
| frontAudio | file | single, audio |
| backText | text | ixtiyoriy |
| backImage | file | single, image |
| backAudio | file | single, audio |
| icon | text | emoji, ixtiyoriy |
| status | select (single) | `new`, `hard`, `easy`, `memorized` (default `new`) |
| easyStreak | number | default 0 |
| lastReviewed | date | ixtiyoriy |
| owner | relation → ilmify_users | required, cascadeDelete |
| created/updated | autodate | |

### `ilmify_reviews` (base) — faqat create/list
| Maydon | Tur | Izoh |
|--------|-----|------|
| card | relation → ilmify_cards | required, cascadeDelete |
| deck | relation → ilmify_decks | required, cascadeDelete |
| grade | select (single) | `hard`, `medium`, `easy` |
| owner | relation → ilmify_users | required, cascadeDelete |
| created | autodate | analitika vaqt o'qi |

**Kaskad:** deck o'chsa → cards + reviews o'chadi; card o'chsa → o'sha card reviews o'chadi.
**Fayl URL:** `pb.files.getURL(record, filename)` (rasm/audio ko'rsatish).

## 5. Sof mantiq (TDD, Vitest)

### `src/lib/card-status.ts`
- `nextStatus(current, easyStreak, grade)` — §3 qoidalari. Og'ir unit test (har grade × har holat, memorized chegarasi, streak reset).

### `src/lib/analytics.ts`
- `computeStreak(reviewDates: string[], today: string): number` — ketma-ket kunlar (bugundan orqaga). Sof, testlanadi (bo'sh, uzilish, bugun yo'q holatlar).
- `dailyReviewCounts(reviews: Review[], days: number, today: string): { date: string; count: number }[]` — oxirgi N kun, nol kunlar bilan.
- `accuracyOverTime(reviews, days, today)` — kunlik `(easy+medium)/jami` %.
- `statusDistribution(cards: Card[]): Record<CardStatus, number>`.
- `growth(daily)` — oxirgi hafta vs oldingi hafta o'zgarishi (o'sish/kamayish %).

### Zod
- `cardInputSchema` — front matn YOKI front rasm kamida biri shart (aks holda "Old tomon bo'sh"); icon ixtiyoriy.
- `gradeSchema` — `hard`/`medium`/`easy`.

## 6. Repository + TanStack Query

### `src/lib/pb/cards.ts`
- `listCards(deckId, status?)` — `filter: deck = deckId (&& status = ...)`, sort `-updated`.
- `createCard(deckId, input)` — FormData (matn + fayllar) bilan create; owner, status="new", easyStreak=0.
- `updateCard(id, input)` — matn/fayl yangilash (fayl o'chirish: bo'sh maydon).
- `deleteCard(id)` — cascade reviews.
- `gradeCard(id, grade)` — `nextStatus` hisoblab card yangilash + `createReview`. Review yozilmasa xato ko'rsatiladi (jim yutilmaydi).
- `mapRecordToCard` — file maydonlarni URL/nomga map qiladi.

### `src/lib/pb/reviews.ts`
- `createReview({card, deck, grade})`, `listReviews(deckId?)` — barcha yoki deck bo'yicha, sort `created`.

### Hooks
- `card-queries.ts`: `useCards(deckId, status?)`, `useCreateCard`, `useUpdateCard`, `useDeleteCard`, `useGradeCard` — key `["cards", deckId]`; grade/mutatsiya `["cards", deckId]`, `["reviews", deckId]`, `["reviews"]`, `["cardCounts", deckId]` invalidatsiya.
- `review-queries.ts`: `useReviews(deckId?)` — analitika uchun.
- `useDeckCardCount(deckId)` — `["cardCounts", deckId]` (DeckCard uchun haqiqiy son).

## 7. UI

### Marshrutlar
- **`/decks`** (mavjud) — DeckCard'lar; ⋯ menyu bug tuzatiladi (Base UI render prop); haqiqiy karta soni; butun karta `/decks/[deckId]`ga `Link`.
- **`/decks/[deckId]`** (AuthGuard) — deck detali:
  - Header: deck nomi, orqaga link, **"O'rganish"** (study), **"Yangi karta"**.
  - **Filtr chiplari:** `Hammasi · Yangi · Qiyin · Oson · Yodlangan` (har birida son); tanlangan filtr ro'yxatni cheklaydi.
  - Karta ro'yxati: icon, front matn (qisqa) + rasm bor bo'lsa mini thumbnail, status rangli belgi, ⋯ menyu (Tahrirlash/O'chirish).
  - Bo'sh / loading / error holatlar.
- **`/decks/[deckId]/study`** (AuthGuard) — study sessiya (§8).
- **`/analytics`** (AuthGuard) — umumiy statistika (§9).

### Karta muharriri — `card-editor-dialog.tsx`
- **Front bo'limi:** matn (textarea) + `[+ Rasm]` (yuklash → preview + o'chirish) + `[+ Audio]` (yuklash → play + o'chirish).
- **Back bo'limi:** xuddi shunday.
- **Icon:** emoji kiritish/tanlash (kichik emoji tugmalar to'plami yoki matn input).
- Validatsiya (zod): front matn yoki rasm kamida biri.
- Create/update; fayl o'zgarmasa qayta yuklanmaydi.

### Media komponentlari
- `media-upload.tsx` — rasm/audio yuklash, preview, o'chirish (qayta ishlatiladigan).
- Karta ko'rsatishda: rasm `<img>` (PB URL), audio `<audio controls>`.

### site-header
- "Decklar" | "Analitika" navigatsiya havolalari qo'shiladi.

## 8. Study oqimi — `/decks/[deckId]/study`

- Kirish: `useCards(deckId)` → **aralashtirilgan navbat** (ixtiyoriy: filtr orqali kelgan bo'lsa o'sha to'plam; `?status=hard` query param).
- Karta ko'rinishi: front (matn + rasm + audio play) → **"Javobni ko'rish"** tugmasi → back ochiladi → **[Qiyin] [O'rtacha] [Oson]** tugmalari.
- Baho bosilganda: `gradeCard(id, grade)` (review yoziladi + status yangilanadi); keyingi kartaga o'tadi.
- **Qiyin qayta ko'rsatish:** "Qiyin" bosilgan karta joriy sessiya navbati oxiriga qo'shiladi (bir marta qayta ko'rsatiladi; cheksiz loop yo'q — qayta ko'rsatilgan kartada baho yakuniy).
- Progress: `ko'rilgan / jami`.
- Sessiya oxiri: xulosa — nechta karta, taqsimot (Qiyin/O'rtacha/Oson soni), "Deck'ga qaytish" / "Qayta o'rganish".
- Bo'sh deck: "Avval karta qo'shing" holati.

## 9. Analitika — `/analytics`

`useReviews()` (barcha) + barcha decklar kartalaridan hisoblanadi. Recharts bilan:

- **Streak kartasi:** `computeStreak` — ketma-ket o'rgangan kunlar (🔥 X kun).
- **Kunlik reviewlar (BarChart, 30 kun):** `dailyReviewCounts` — o'sish/kamayish rozetkasi (`growth`: bu hafta vs o'tgan hafta, ▲/▼ %).
- **Aniqlik trendi (LineChart):** `accuracyOverTime` — kunlik to'g'ri %.
- **Karta holati taqsimoti (PieChart/donut):** `statusDistribution` — Yangi/Qiyin/Oson/Yodlangan.
- **Umumiy kartalar (KPI qatori):** jami decklar, kartalar, review'lar, yodlangan %.
- Bo'sh holat: hali review yo'q bo'lsa — "O'rganishni boshlang" ko'rsatmasi.
- Grafiklar `dataviz` tamoyillari bilan (izchil ranglar, light/dark, o'qish oson).

## 10. Deck edit/delete bug

Kod mavjud (`deck-card.tsx` ⋯ menyu → `onEdit`/`onDelete`). Base UI `DropdownMenuTrigger render` prop quirk (memory'da qayd etilgan) sabab ochilmasligi mumkin. Tekshiriladi:
- `DropdownMenu` Base UI API to'g'ri ishlatilganini tasdiqlash (render prop vs children).
- Kerak bo'lsa `render`/`trigger` naqshini tuzatish; e2e/qo'lda menyu ochilishini tasdiqlash.

## 11. Xatolar va chekka holatlar

- **Fayl yuklash xatosi:** foydalanuvchiga ko'rsatiladi (jim yutilmaydi); karta baribir matn bilan saqlanishi mumkin (fayl ixtiyoriy).
- **gradeCard xatosi:** review yozilmasa xato toast; UI keyingi kartaga o'tmaydi (yoki qayta urinish).
- **Bo'sh front:** validatsiya rad etadi.
- **Katta fayl:** PB limitiga tayanamiz; klientda ogohlantirish (masalan >5MB rasm).
- **Offline:** PWA — read cache; yozuv onlayn talab qilinadi (M2+ da offline-yozuv yo'q).

## 12. Testlar

- **Unit (Vitest):** `card-status.ts` (barcha o'tishlar), `analytics.ts` (streak/daily/accuracy/growth/distribution chekka holatlar), `cardInputSchema`.
- **E2E (Playwright, jonli PB):** login → deck ochish → karta yaratish (matn) → rasmli karta yaratish → filtr (status chiplari) → study sessiya (baho ber → status o'zgaradi) → deck detalida filtr yangilanadi → analitikada streak/reviewlar ko'rinadi → karta tahrirlash/o'chirish → deck edit/delete menyu ishlaydi.

## 13. Yangi bog'liqliklar

- `recharts` — analitika grafiklari.
- Emoji picker: yengil (sof komponent yoki kichik paket — implementatsiyada hal qilinadi; birinchi navbatda oddiy emoji tugmalar to'plami, paketsiz).

## 14. Ko'lam tashqarisi

- To'liq FSRS / interval jadval (kelajak M3).
- PDF / umumiy fayl biriktirish.
- Cloze, rich-text (Tiptap), type-in.
- Subdeck nesting, qidiruv, teg UI.
- Offline yozuv/sinxronizatsiya.

## 15. Definition of Done

1. PWA ikonka oq "I" + binafsha gradient ko'rsatadi (barcha o'lchamlar).
2. `ilmify_cards` + `ilmify_reviews` kolleksiyalari (owner RLS, cascade, file maydonlar) idempotent yaratilgan; mavjudlarga tegilmagan.
3. `card-status.ts` + `analytics.ts` sof funksiyalar, unit-testlar yashil.
4. `/decks/[deckId]`: karta browse + create/edit/delete + status filtrlar ishlaydi; rasm/audio/emoji biriktirish.
5. `/decks/[deckId]/study`: study sessiya, 3 baho, status avtomatik yangilanadi, review yoziladi, Qiyin qayta ko'rsatish.
6. `/analytics`: streak, kunlik reviewlar (o'sish/kamayish), aniqlik trendi, holat taqsimoti, KPI'lar (recharts).
7. DeckCard haqiqiy karta sonini ko'rsatadi + deck detalga link; edit/delete menyu ishlaydi.
8. E2E o'tadi; barcha UI matni `uz.json`da; TS strict; `pnpm build` xatosiz.
