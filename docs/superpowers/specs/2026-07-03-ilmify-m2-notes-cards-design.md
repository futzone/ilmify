# Ilmify — M2 (Notes/Cards + Editor) Dizayn Spec

- **Sana:** 2026-07-03
- **Milestone:** M2 — Notes/Cards + rich editor (PocketBase ustida)
- **Holat:** Tasdiqlangan (dizayn)
- **Oldingi:** [Backend & Auth](2026-07-03-ilmify-backend-auth-design.md) ✅ — PocketBase + auth
- **Ko'lam:** Basic + Basic-reversed + Cloze. Type-in / media / LaTeX → M2b. FSRS → M3.

## 1. Kontekst

Backend & Auth deck'larni PocketBase'ga (per-user, TanStack Query) ko'chirdi. M2 **note'lar va kartalar**ni qo'shadi: foydalanuvchi deck ichida rich-text note yaratadi, undan avtomatik kartalar generatsiya qilinadi. O'rganish (FSRS) hali yo'q — bu M3.

## 2. Brainstorming qarorlari

- **Ko'lam:** Basic (savol/javob), Basic+reversed (2 karta), Cloze (`{{...}}` bo'shliqlar). Type-in/media/LaTeX kechiktirilgan.
- **Matn kiritish:** Rich text (Tiptap), HTML sifatida saqlanadi.
- **Cloze:** Tiptap custom **mark** (`data-cloze="N"`) — matnni belgilab tugma bilan; literal `{{c1::}}` emas.
- **Karta generatsiyasi:** **klient-side** — sof `generateCards()` + PocketBase'ga yozish.
- **Tahrirlashda:** eski kartalarni **o'chirib qayta yaratish** (M2'da FSRS holati yo'q, yo'qotish yo'q).
- **Atomiklik:** note + kartalar ketma-ket yoziladi; xatoda kompensatsiya (note o'chiriladi). PB global batch sozlamasi shared instance'da o'zgartirilmaydi.

## 3. PocketBase kolleksiyalar (yangi, `pb-setup.mjs`ga qo'shiladi, idempotent)

### `ilmify_notes` (base)
| Maydon | Tur | Izoh |
|--------|-----|------|
| deck | relation → ilmify_decks | required, single, **cascadeDelete** |
| noteType | select (single) | `basic`, `basicReversed`, `cloze` |
| fields | json | basic/reversed: `{front, back}` (HTML); cloze: `{text}` (HTML, cloze mark'lar bilan) |
| tags | json | default `[]` (UI keyin) |
| owner | relation → ilmify_users | required, single |

### `ilmify_cards` (base)
| Maydon | Tur | Izoh |
|--------|-----|------|
| note | relation → ilmify_notes | required, single, **cascadeDelete** |
| deck | relation → ilmify_decks | required, single, cascadeDelete |
| templateIndex | number | basic:0 \| reversed:0,1 \| cloze:0 |
| clozeIndex | number | cloze kartalar uchun (c1→1); boshqalarda 0 yoki bo'sh |
| owner | relation → ilmify_users | required, single |

**API rules (ikkalasi, barcha amal):** `@request.auth.id != "" && owner = @request.auth.id`.
**Kaskad:** deck o'chirilganda notes (note.deck cascade) va cards (card.deck cascade) o'chadi; note o'chirilganda cards (card.note cascade) o'chadi.

## 4. Ma'lumot modeli (app)

```ts
type NoteType = "basic" | "basicReversed" | "cloze";

type BasicFields = { front: string; back: string };   // HTML
type ClozeFields = { text: string };                    // HTML (cloze mark'lar)
type NoteFields = BasicFields | ClozeFields;

type Note = {
  id: string; deck: string; noteType: NoteType;
  fields: NoteFields; tags: string[];
  owner: string; created: string; updated: string;
};

type NoteInput = { noteType: NoteType; fields: NoteFields; tags?: string[] };  // zod

type Card = {
  id: string; note: string; deck: string;
  templateIndex: number; clozeIndex: number | null;
  owner: string; created: string; updated: string;
};

type CardSpec = { templateIndex: number; clozeIndex: number | null };  // generateCards natijasi
```

## 5. Sof mantiq (TDD)

### `src/lib/cloze.ts`
- `extractClozeIndices(html: string): number[]` — `<span data-cloze="N">` lardan aniq, tartiblangan indekslar.
- `renderClozeCard(html, index): { front: string; back: string }` — front: `index` cloze'i `[...]` bilan yashiriladi, boshqa cloze'lar oddiy matn sifatida ochiladi; back: barcha cloze'lar ochiq.
- Sof, DOM'siz (regex/parser bilan), Vitest'da og'ir test.

### `src/lib/card-generation.ts`
- `generateCards(noteType: NoteType, fields: NoteFields): CardSpec[]`:
  - `basic` → `[{templateIndex:0, clozeIndex:null}]`
  - `basicReversed` → `[{0,null},{1,null}]`
  - `cloze` → `extractClozeIndices(fields.text)` har biri uchun `{templateIndex:0, clozeIndex:i}`; indeks yo'q bo'lsa `[]` (validatsiya buni rad etadi).
- Sof, test.

### `src/components/editor/cloze-mark.ts`
- Tiptap `Mark` extension: `data-cloze` atributi; `setCloze(index)`/`toggleCloze` buyruq. Toolbar tugmasi tanlovga keyingi indeksni beradi.

## 6. Repository + TanStack Query

### `src/lib/pb/notes.ts`
- `createNote(deckId, input): Promise<Note>` — zod parse; `generateCards`; note yozadi (owner=auth); har CardSpec uchun card yozadi (note/deck/owner bilan); karta yozishda xato → note o'chiriladi (kompensatsiya), throw.
- `listNotes(deckId): Promise<Note[]>` — `filter: deck = deckId`, sort `-updated`.
- `getNote(id)`, `updateNote(id, input)` (note yangilanadi; `listCardsByNote` → hammasini o'chiradi; `generateCards` → qayta yozadi), `deleteNote(id)` (cascade cards).

### `src/lib/pb/cards.ts`
- `listCardsByNote(noteId): Promise<Card[]>`, `countCardsByDeck(deckId): Promise<number>` (`getList(1,1,{filter}).totalItems`).

### `src/lib/pb/note-queries.ts` (TanStack hooks)
- `useNotes(deckId)`, `useCreateNote(deckId)`, `useUpdateNote(deckId)`, `useDeleteNote(deckId)` — key `["notes", deckId]`; mutation'lar `["notes", deckId]` va `["deckCardCount", deckId]` ni invalidatsiya qiladi.
- `useDeckCardCount(deckId)` — key `["deckCardCount", deckId]`.

## 7. UI

### Marshrutlar
- **`/decks/[deckId]`** (himoyalangan, AuthGuard) — deck detali:
  - Header (deck nomi, "Yangi karta" tugmasi, orqaga link).
  - Note ro'yxati: har note kartasi — noteType belgisi, birinchi maydonning qisqa (matn) ko'rinishi, karta soni, ⋯ menyu (Tahrirlash/O'chirish).
  - Empty/loading/error holatlar.
- **DeckCard** (`/decks`) — `useDeckCardCount` bilan haqiqiy son; butun karta `/decks/[deckId]`ga `Link`.

### Note editor (`note-editor-dialog.tsx`)
- Tur tanlash (segmented/tabs: Basic / Reversed / Cloze).
- Maydonlar turga qarab: basic/reversed → front + back rich editor; cloze → bitta rich editor + "Cloze" tugma.
- **Generatsiya preview** — joriy fields'dan `generateCards` + `renderClozeCard`/basic render orqali kartalar ro'yxati (front/back) ko'rsatiladi.
- Saqlash → create yoki update.
- `RichTextEditor` (`src/components/editor/rich-text-editor.tsx`) — Tiptap + toolbar (bold, italic, bullet; cloze rejimida Cloze tugma).

### Xavfsizlik (render)
- Note fields HTML — faqat Tiptap-schema orqali yaratilgan (script yo'q). Render'da schema-cheklangan HTML `dangerouslySetInnerHTML` bilan ko'rsatiladi (Tiptap generateHTML yoki saqlangan HTML). DOMPurify shart emas (schema kafolati).

## 8. Xatolar va chekka holatlar

- **Bo'sh note:** basic front bo'sh → validatsiya rad etadi ("Old tomon shart"). Cloze: kamida 1 cloze mark yo'q → "Kamida bitta cloze belgilang".
- **Karta yozish xatosi (createNote):** note kompensatsiya bilan o'chiriladi, foydalanuvchiga xato ko'rsatiladi.
- **Network/query xato:** ko'rinadigan xato holati (jimgina yutilmaydi).
- **updateNote qayta-generatsiya:** eski kartalarni o'chirish + yangi yozish ketma-ket; nomukammal atomiklik M2 uchun qabul qilinadi (FSRS holati yo'q).

## 9. Testlar

- **Unit (Vitest):** `cloze.ts` (index extraction, front/back render, chekka holatlar), `card-generation.ts` (har tur), `noteInputSchema` zod. Og'ir TDD.
- **E2E (Playwright, jonli PB):** login → deck ochish → Basic note yaratish (1 karta) → Reversed (2 karta) → Cloze (2 cloze → 2 karta) → note tahrirlash (kartalar qayta yaratiladi) → o'chirish (kartalar kaskad) → deck kartasida karta soni yangilanadi.

## 10. Yangi bog'liqliklar

- `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm` (ProseMirror). Cloze mark uchun `@tiptap/core`.

## 11. Ko'lam tashqarisi

- Type-in, media (rasm/audio), LaTeX/KaTeX, teg UI, Image Occlusion.
- FSRS / o'rganish sessiyasi (M3).
- Subdeck nesting, qidiruv/filtr.

## 12. Definition of Done

1. `ilmify_notes` + `ilmify_cards` kolleksiyalari yaratilgan (owner RLS, cascade), mavjudlarga tegilmagan.
2. `cloze.ts` + `card-generation.ts` sof funksiyalar, unit-testlar yashil.
3. Har uch turdagi note yaratish to'g'ri kartalar generatsiya qiladi (klient-side).
4. `/decks/[deckId]` deck-detail: note browse + create/edit/delete ishlaydi.
5. Rich editor (Tiptap) + cloze mark; editor'da karta preview.
6. Note tahrirlash kartalarni qayta yaratadi; o'chirish kaskadi ishlaydi.
7. DeckCard haqiqiy karta sonini ko'rsatadi va `/decks/[deckId]`ga o'tadi.
8. E2E (har tur + edit + delete + count) o'tadi; barcha UI matni `uz.json`dan.
9. TS strict; `pnpm build` xatosiz.
