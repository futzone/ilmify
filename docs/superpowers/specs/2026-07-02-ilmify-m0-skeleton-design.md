# Ilmify — M0 (Skelet) Dizayn Spec

- **Sana:** 2026-07-02
- **Milestone:** M0 — Skelet
- **Holat:** Tasdiqlangan (dizayn)
- **Domen:** ilmify.uz

## 1. Kontekst

Ilmify — Anki'ning zamonaviy, chiroyli va AI bilan boyitilgan muqobili. Ilmiy metod (FSRS / interval takrorlash) saqlanadi, lekin UI/UX zamonaviylashtiriladi va AI-native qilinadi.

To'liq mahsulot 8 milestone (M0–M8). Har milestone alohida spec → plan → implement tsikli sifatida quriladi. Ushbu hujjat faqat **M0** ni qamraydi.

## 2. Asosiy qarorlar (brainstorming natijasi)

- **Backend:** Hozircha **local-only**. Cloud/DB/Auth kechiktiriladi. M0'da hech qanday backend/auth kutubxonasi o'rnatilmaydi.
- **M0 ko'lami:** Toza, minimal, ishlaydigan skelet.
- **Milestone tartibi (local-only tufayli qayta tartiblangan):**
  - M0 — Skelet (ushbu spec)
  - M1′ — Local ma'lumot qatlami + Deck CRUD (Dexie, auth'siz)
  - M2 — Kartalar + Editor
  - M3 — FSRS o'rganish yadrosi
  - M4 — AI qatlami
  - M5 — MCP integratsiya
  - M6 — Offline mustahkamlash + (keyin) Auth + Cloud Sync
  - M7 — Import/Export (`.ilm` + CSV)
  - M8 — Statistika + Gamifikatsiya

## 3. Tech tanlovlar

| Qaror | Tanlov | Sabab |
|-------|--------|-------|
| Package manager | pnpm | Tez, disk-tejamkor |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript strict | `create-next-app@latest` (2026-07-02) → v16.2.9; joriy barqaror major |
| Styling | Tailwind CSS v4 + shadcn/ui | Spec talabi |
| i18n | next-intl (default locale: `uz`) | App Router bilan eng yaxshi moslik; `en`/`ru` kelajakda |
| PWA | Serwist (`@serwist/next`) | next-pwa App Router'da eskirgan; Serwist — zamonaviy vorisi |
| Theme | next-themes (system/light/dark) | shadcn standart, SSR-xavfsiz |
| Font | Inter (`next/font`) | Lotin+kirill qo'llaydi |
| UI state (infra) | Zustand | M0'da ishlatilmaydi, struktura tayyorlanadi |
| Local persistence | Dexie | M0'da ishlatilmaydi; M1′ da keladi |

## 4. Papka strukturasi

```
ilmify/
├── public/
│   ├── icons/                 # PWA ikonkalari (192, 512, maskable)
│   └── manifest.webmanifest   # PWA manifest
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout: ThemeProvider, i18n, font
│   │   ├── page.tsx           # Landing / home (bo'sh holat)
│   │   ├── globals.css        # Tailwind + brend CSS o'zgaruvchilari
│   │   └── ~offline/page.tsx  # Offline fallback sahifasi
│   ├── components/
│   │   ├── ui/                # shadcn komponentlari
│   │   ├── theme-toggle.tsx   # Light/dark almashtirgich
│   │   └── locale-switcher.tsx
│   ├── i18n/
│   │   ├── config.ts          # locales: ['uz'], default: 'uz'
│   │   └── request.ts         # next-intl server config
│   ├── lib/
│   │   └── utils.ts           # cn() va yordamchilar
│   └── sw.ts                  # Serwist service worker
├── messages/
│   └── uz.json                # O'zbekcha UI matnlari
├── components.json            # shadcn konfig
├── next.config.ts             # Serwist + i18n plugin
├── tailwind.config.ts
└── tsconfig.json              # strict: true
```

## 5. Brend / dizayn tokenlari

- Bitta asosiy brend rangi (chuqur binafsha/ko'k) + neytral kulranglar.
- `globals.css` da CSS o'zgaruvchi sifatida, light va dark uchun alohida qiymatlar.
- Dumaloq burchaklar (rounded-2xl), yumshoq soyalar, ko'p whitespace.
- Baholash tugmalari rang semantikasi (M3'da ishlatiladi, tokenlar M0'da e'lon qilinishi mumkin): Again=qizil, Hard=to'q sariq, Good=yashil, Easy=ko'k.
- Barcha bosiladigan elementlar ≥ 44×44px.

## 6. Definition of Done

1. `pnpm dev` xatosiz ishga tushadi.
2. **Landing sahifa** — Ilmify nomi, qisqa tavsif, "Boshlash" tugmasi (placeholder). Chiroyli empty-state.
3. **Dark/Light/System** rejim flicker'siz ishlaydi.
4. **i18n** — barcha UI matni `messages/uz.json` dan (hard-code emas).
5. **PWA** — manifest + service worker; brauzer "install" taklif qiladi; offline fallback ishlaydi.
6. **Brend tokenlari** `globals.css` da (light/dark).
7. **Responsive**, mobil-first, 44px+ tap-target.
8. TypeScript strict; `pnpm build` xatosiz o'tadi.

## 7. Testlar (M0 minimal)

- Vitest sozlangan.
- `cn()` util va i18n konfig uchun sanity unit-test.
- Chuqur test (FSRS scheduling, cloze parsing) keyingi milestone'larda.

## 8. Ko'lam tashqarisi (M0 emas)

- Auth, cloud DB, sync.
- Karta yaratish/editor, FSRS, o'rganish sessiyasi.
- AI, MCP.
- Import/export, statistika.
- Bular keyingi milestone spec'larida.

## 9. Xavflar / eslatmalar

- Tailwind v4 + shadcn moslik: shadcn'ning v4 uchun yangi init oqimidan foydalaniladi.
- Serwist dev rejimida SW'ni o'chirib qo'yish odatiy (faqat prod build'da to'liq test qilinadi).
- next-intl "locale'siz" (default-only) rejimda ishlatiladi — hozircha URL prefiksi yo'q, kelajakda ko'p til qo'shilganda migratsiya qilinadi.
