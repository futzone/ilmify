<div align="center">

# 🧠 Ilmify

**Anki'ning zamonaviy, chiroyli va AI bilan boyitilgan muqobili.**

Ilmiy metod (interval takrorlash / spaced repetition) — o'zgarmagan.
UI/UX — butunlay yangilangan. AI — birinchi kundan integratsiyalangan.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149eca)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8)](https://tailwindcss.com)
[![PWA](https://img.shields.io/badge/PWA-installable-5b21b6)](https://web.dev/progressive-web-apps/)

</div>

---

## Ilmify nima?

**Ilmify** — talabalar, til o'rganuvchilar va professionallar uchun **AI yordamida kartochka yaratadigan**, **interval takrorlash** asosida yodlashni avtomatlashtiradigan web + PWA ilova.

Anki'ning yodlash algoritmi ilmiy jihatdan mukammal, lekin uning interfeysi eskirgan, tugmalari mayda, hot-key'lari chalkash va AI yo'q. **Ilmify o'sha metodni saqlab qolgan holda, zamonaviy va aqlli qobiq beradi.**

## Nega Ilmify? (Anki muammolari → bizning yechim)

| Anki muammosi | Ilmify yechimi |
|---|---|
| Xunuk, eskirgan UI | Zamonaviy, minimalist, iliq dizayn |
| Juda kichik tugmalar | Katta, barmoqqa qulay (min **44px**) tugmalar |
| Chalkash hot-key'lar | Aniq, ko'rinadigan, sozlanadigan shortcut'lar |
| AI yo'q | AI karta generatsiyasi, tushuntirish, MCP integratsiya |
| Qiyin karta yaratish | Tez, aqlli editor + bir klikda AI'dan karta |
| Murakkab sinxronizatsiya | Silliq, avtomatik cloud sync (offline-first) |

## Asosiy imkoniyatlar (reja)

- 🎯 **FSRS algoritmi** — Anki'ning eng zamonaviy interval rejalashtirgichi (Again / Hard / Good / Easy).
- 🃏 **Kontent turlari** — Basic, Basic + reversed, Cloze deletion, Type-in, media, KaTeX formulalar.
- 🤖 **AI qatlami** — matn/PDF → kartochka generatsiyasi, "Tushuntir" tugmasi, AI Tutor.
- 🔌 **MCP integratsiya** — Ilmify'ni MCP server sifatida ochish; Claude va boshqa agentlar deck'larga karta qo'sha oladi.
- 📦 **`.ilm` native format** — deck + media'ni bitta faylda ulashish (ZIP-asosli konteyner).
- 📴 **Offline-first PWA** — o'rnatiladigan, offline ishlaydigan, push bildirishnomalar.
- 📊 **Progress** — streak, retention %, heatmap, badge'lar.

## Texnologik stack

| Qatlam | Tanlov |
|---|---|
| Framework | **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict) |
| Styling | **Tailwind CSS v4** + **shadcn/ui** (Base UI primitivlar) |
| Theme | `next-themes` — light / dark / system |
| i18n | `next-intl` — hozircha `uz`, kelajakda `en` / `ru` |
| PWA | **Serwist** (`@serwist/next`) — service worker + offline |
| Testlar | **Vitest** |
| Data (keyingi bosqich) | Dexie (IndexedDB), keyin cloud sync |

## Ishga tushirish

```bash
# Bog'liqliklarni o'rnatish
pnpm install

# Dev server (http://localhost:3000)
pnpm dev

# Prod build (Serwist SW webpack orqali generatsiya qilinadi)
pnpm build && pnpm start

# Testlar
pnpm test
```

> **Eslatma:** prod `build` `next build --webpack` ishlatadi, chunki `@serwist/next` hozircha Next 16 Turbopack prod-build'da service worker chiqarmaydi. Dev rejim Turbopack'da qoladi.

## Loyiha strukturasi

```
src/
├── app/                # App Router: layout, page, manifest.ts, sw.ts, ~offline/
│   └── globals.css     # Tailwind v4 + brend/rating rang tokenlari
├── components/
│   ├── ui/             # shadcn komponentlari (button, card, dropdown-menu)
│   ├── theme-*.tsx     # ThemeProvider + ThemeToggle
│   └── site-header.tsx
├── i18n/               # next-intl konfig (config.ts, request.ts)
└── lib/                # utils (cn) + testlar
messages/uz.json        # barcha UI matni (hard-code emas)
docs/superpowers/       # dizayn spec + implementation plan
```

## Yo'l xaritasi (Milestones)

| | Milestone | Holat |
|---|---|---|
| **M0** | Skelet — Next.js, Tailwind, shadcn, PWA, dark/light, i18n(uz) | ✅ **Tugallandi** |
| M1′ | Local ma'lumot qatlami (Dexie) + Deck CRUD | ⏳ Keyingi |
| M2 | Kartalar + Editor (Basic, Cloze, Type-in, LaTeX, media) | 🔜 |
| M3 | O'rganish yadrosi — FSRS, sessiya, shortcut'lar, swipe | 🔜 |
| M4 | AI qatlami — Card Generator, Explain, provider wrapper | 🔜 |
| M5 | MCP integratsiya (add_cards, list_decks, get_stats) | 🔜 |
| M6 | Offline mustahkamlash + Auth + Cloud Sync | 🔜 |
| M7 | Import/Export — `.ilm` native format + CSV | 🔜 |
| M8 | Statistika + Gamifikatsiya | 🔜 |

> Har milestone alohida spec → plan → implement tsikli sifatida quriladi.
> Batafsil: [`docs/superpowers/`](docs/superpowers/).

## Dizayn tamoyillari

- Zamonaviy, minimalist, iliq. Ko'p whitespace, yumshoq soyalar, `rounded-2xl`.
- Yorug' / Qorong'i / Tizim rejimi.
- Brend rangi (chuqur binafsha `#5b21b6`) + baholash ranglari (Again=qizil, Hard=to'q sariq, Good=yashil, Easy=ko'k).
- Barcha bosiladigan elementlar ≥ 44×44px.
- To'liq responsive, mobil-first.

---

<div align="center">

**ilmify.uz** · O'zbekiston uchun, dunyo standartida.

</div>
