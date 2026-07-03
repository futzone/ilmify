# Ilmify M0 (Skelet) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ilmify uchun toza, ishlaydigan frontend skeletini qurish — Next.js + Tailwind + shadcn/ui + dark/light theme + o'zbek i18n + PWA.

**Architecture:** Next.js 16 App Router (React 19), `src/` katalogi bilan. UI matnlari next-intl orqali `messages/uz.json` dan keladi (bitta locale, URL prefiksisiz). Theme next-themes bilan (`class` strategiyasi). PWA Serwist bilan (SW `src/app/sw.ts`, offline fallback sahifa). Hech qanday backend/DB/auth yo'q — local-only bosqichdan oldingi skelet.

**Tech Stack:** pnpm (bu sandbox'da `npx pnpm@latest` orqali), Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict), Tailwind CSS v4, shadcn/ui, next-intl, next-themes, @serwist/next, Vitest.

## Global Constraints

- Package manager: **pnpm** (barcha buyruqlar pnpm bilan).
- TypeScript **strict: true** — istisno yo'q.
- UI matni **hard-code qilinmaydi** — hammasi `messages/uz.json` dan `useTranslations`/`getTranslations` orqali.
- Default locale: **`uz`**. Kirill emas, lotin o'zbek.
- Barcha bosiladigan elementlar **≥ 44×44px** (Tailwind: `min-h-11 min-w-11` yoki `size-11`).
- Brend ranglari va neytrallar **CSS o'zgaruvchi** sifatida `globals.css` da (light + dark).
- Dumaloq burchaklar `rounded-2xl`, yumshoq soyalar, ko'p whitespace.
- Har task oxirida commit. Commit xabari inglizcha, `feat:`/`chore:`/`test:` prefiksi bilan.

---

### Task 1: Next.js loyihasini bootstrap qilish

Papkada allaqachon `docs/`, `.git`, `.gitignore` bor, shuning uchun `create-next-app` to'g'ridan-to'g'ri joriy papkaga ishlamaydi. Vaqtinchalik papkaga scaffold qilib, keyin ildizga ko'chiramiz.

**Files:**
- Create: butun Next.js skeleti (`package.json`, `tsconfig.json`, `next.config.ts`, `src/app/*`, `postcss.config.mjs`, ...)
- Modify: `.gitignore` (Next shablonini mavjud bilan birlashtirish)

**Interfaces:**
- Produces: ishlaydigan `pnpm dev`/`pnpm build`; `@/*` import aliasi `src/` ga; `src/app/globals.css` Tailwind v4 bilan; `src/lib/utils.ts` (shadcn init keyin qo'shadi).

- [ ] **Step 1: Vaqtinchalik papkaga scaffold qilish**

Run:
```bash
pnpm create next-app@latest .ilmify-tmp \
  --ts --app --src-dir --tailwind --eslint \
  --import-alias "@/*" --use-pnpm --turbopack
```
Expected: `.ilmify-tmp/` ichida to'liq Next.js loyihasi yaratiladi.

- [ ] **Step 2: Fayllarni ildizga ko'chirish va tmp'ni tozalash**

Run:
```bash
# .gitignore dan tashqari hamma narsani (yashirin fayllar bilan) ko'chiramiz
mv .ilmify-tmp/.gitignore .ilmify-tmp/gitignore-next 2>/dev/null || true
shopt -s dotglob 2>/dev/null || setopt dotglob 2>/dev/null || true
mv .ilmify-tmp/* . 2>/dev/null || true
# Next'ning .gitignore qatorlarini mavjudiga qo'shamiz (dublikatsiz)
cat gitignore-next >> .gitignore 2>/dev/null || true
sort -u .gitignore -o .gitignore
rm -f gitignore-next
rm -rf .ilmify-tmp
```
Expected: `package.json`, `src/app/page.tsx`, `next.config.ts` endi ildizda.

- [ ] **Step 3: Bog'liqliklarni o'rnatish**

Run: `pnpm install`
Expected: `node_modules/` yaratiladi, xatosiz.

- [ ] **Step 4: strict rejim tasdig'i**

`tsconfig.json` ichida `"strict": true` borligini tekshiring. Bo'lmasa qo'shing.

- [ ] **Step 5: Build ishlashini tekshirish**

Run: `pnpm build`
Expected: "Compiled successfully" — xatosiz build.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: bootstrap Next.js app with Tailwind v4 and TS strict"
```

---

### Task 2: shadcn/ui init + asosiy komponentlar

**Files:**
- Create: `components.json`, `src/components/ui/button.tsx`, `src/components/ui/card.tsx`
- Modify: `src/lib/utils.ts` (shadcn `cn()` qo'shadi), `src/app/globals.css` (shadcn theme qatlamlari)

**Interfaces:**
- Produces: `import { cn } from "@/lib/utils"`; `import { Button } from "@/components/ui/button"`; `import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"`.

- [ ] **Step 1: shadcn init**

Run:
```bash
pnpm dlx shadcn@latest init -d -b neutral
```
(`-d` = default'lar bilan, `-b neutral` = neutral base color; interaktiv promptlarsiz.)
Expected: `components.json` yaratiladi, `src/lib/utils.ts` ichida `cn()` paydo bo'ladi, `globals.css` shadcn o'zgaruvchilari bilan yangilanadi.

- [ ] **Step 2: Button va Card qo'shish**

Run:
```bash
pnpm dlx shadcn@latest add button card
```
Expected: `src/components/ui/button.tsx` va `src/components/ui/card.tsx` yaratiladi.

- [ ] **Step 3: Build tasdig'i**

Run: `pnpm build`
Expected: xatosiz build.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add shadcn/ui with button and card components"
```

---

### Task 3: Brend tokenlari + theme tizimi (dark/light/system)

**Files:**
- Create: `src/components/theme-provider.tsx`, `src/components/theme-toggle.tsx`
- Modify: `src/app/globals.css` (brend rang tokenlari), `src/app/layout.tsx` (ThemeProvider + `suppressHydrationWarning`), `messages/uz.json` (bu task'da hali yo'q bo'lsa, Task 4 da matn qo'shiladi — hozircha toggle uchun `aria-label` matnini vaqtincha inline berib, Task 5 da i18n'ga ko'chiramiz)

**Interfaces:**
- Consumes: `Button` (Task 2), `next-themes`.
- Produces: `<ThemeProvider>` wrapper; `<ThemeToggle />` komponenti; CSS o'zgaruvchilari `--brand`, `--brand-foreground` va baholash ranglari `--rating-again/-hard/-good/-easy`.

- [ ] **Step 1: next-themes o'rnatish**

Run: `pnpm add next-themes`
Expected: `package.json` ga qo'shiladi.

- [ ] **Step 2: ThemeProvider yaratish**

Create `src/components/theme-provider.tsx`:
```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

- [ ] **Step 3: Brend tokenlarini globals.css ga qo'shish**

`src/app/globals.css` ichidagi `:root` va `.dark` bloklariga qo'shing (shadcn o'zgaruvchilari yonига):
```css
:root {
  --brand: oklch(0.52 0.22 285); /* chuqur binafsha/ko'k */
  --brand-foreground: oklch(0.98 0 0);
  --rating-again: oklch(0.63 0.23 25);   /* qizil */
  --rating-hard: oklch(0.72 0.17 60);    /* to'q sariq */
  --rating-good: oklch(0.68 0.17 145);   /* yashil */
  --rating-easy: oklch(0.62 0.18 250);   /* ko'k */
}

.dark {
  --brand: oklch(0.68 0.19 285);
  --brand-foreground: oklch(0.16 0 0);
  --rating-again: oklch(0.58 0.22 25);
  --rating-hard: oklch(0.68 0.16 60);
  --rating-good: oklch(0.62 0.16 145);
  --rating-easy: oklch(0.58 0.17 250);
}

@theme inline {
  --color-brand: var(--brand);
  --color-brand-foreground: var(--brand-foreground);
  --color-rating-again: var(--rating-again);
  --color-rating-hard: var(--rating-hard);
  --color-rating-good: var(--rating-good);
  --color-rating-easy: var(--rating-easy);
}
```

- [ ] **Step 4: ThemeToggle komponenti**

Run: `pnpm dlx shadcn@latest add dropdown-menu` (toggle uchun kerak)
Create `src/components/theme-toggle.tsx`:
```tsx
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-11" aria-label="Rejimni almashtirish">
          <Sun className="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>Yorug'</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>Qorong'i</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>Tizim</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```
(Eslatma: bu yerdagi matnlar Task 5 da i18n'ga ko'chiriladi.)

- [ ] **Step 5: layout.tsx ni ThemeProvider bilan o'rash**

`src/app/layout.tsx` — `<html>` ga `suppressHydrationWarning` qo'shing va `<body>` ichini o'rang:
```tsx
import { ThemeProvider } from "@/components/theme-provider";
// ...
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className={/* mavjud font klasslari */ ""}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Qo'lda tekshirish**

Run: `pnpm dev`, brauzerda `http://localhost:3000` oching. ThemeToggle hali sahifada bo'lmasligi mumkin (Task 5 da qo'yiladi) — bu step'da `pnpm build` xatosiz o'tishini tasdiqlang.
Run: `pnpm build`
Expected: xatosiz.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add theme system with brand tokens and dark/light toggle"
```

---

### Task 4: i18n (next-intl, bitta locale `uz`, URL prefiksisiz)

**Files:**
- Create: `src/i18n/config.ts`, `src/i18n/request.ts`, `messages/uz.json`
- Modify: `next.config.ts` (next-intl plugin), `src/app/layout.tsx` (`NextIntlClientProvider` + `getLocale`/`getMessages`)

**Interfaces:**
- Consumes: `next-intl`.
- Produces: server komponentlarda `getTranslations(namespace)`, client komponentlarda `useTranslations(namespace)`; `messages/uz.json` matn manbai.

- [ ] **Step 1: next-intl o'rnatish**

Run: `pnpm add next-intl`

- [ ] **Step 2: i18n konfig**

Create `src/i18n/config.ts`:
```ts
export const locales = ["uz"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "uz";
```

Create `src/i18n/request.ts`:
```ts
import { getRequestConfig } from "next-intl/server";
import { defaultLocale } from "./config";

export default getRequestConfig(async () => {
  const locale = defaultLocale;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 3: Matn fayli**

Create `messages/uz.json`:
```json
{
  "common": {
    "appName": "Ilmify",
    "start": "Boshlash"
  },
  "theme": {
    "toggleLabel": "Rejimni almashtirish",
    "light": "Yorug'",
    "dark": "Qorong'i",
    "system": "Tizim"
  },
  "landing": {
    "tagline": "Zamonaviy, AI bilan boyitilgan interval takrorlash",
    "description": "Anki'ning ilmiy metodi — chiroyli, tez va aqlli qobiqda. Kartochkalar yarating, AI bilan boyiting, hech narsani unutmang."
  }
}
```

- [ ] **Step 4: next.config.ts ga plugin ulash**

`next.config.ts`:
```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  /* mavjud config */
};

export default withNextIntl(nextConfig);
```

- [ ] **Step 5: layout.tsx ga provider**

`src/app/layout.tsx` ichida:
```tsx
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
// ...
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={/* mavjud font klasslari */ ""}>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: ThemeToggle matnlarini i18n'ga ko'chirish**

`src/components/theme-toggle.tsx` da `useTranslations("theme")` ishlating:
```tsx
import { useTranslations } from "next-intl";
// ...
const t = useTranslations("theme");
// aria-label={t("toggleLabel")}, DropdownMenuItem matnlari: t("light"), t("dark"), t("system")
```

- [ ] **Step 7: Build tasdig'i**

Run: `pnpm build`
Expected: xatosiz.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add next-intl i18n with Uzbek locale"
```

---

### Task 5: Landing sahifa (empty-state) + header

**Files:**
- Modify: `src/app/page.tsx` (landing kontenti), `src/app/globals.css` (agar kerak bo'lsa kichik yordamchi klasslar)
- Create: `src/components/site-header.tsx`

**Interfaces:**
- Consumes: `Button`, `Card` (Task 2), `ThemeToggle` (Task 3), `useTranslations`/`getTranslations` (Task 4).
- Produces: ishlaydigan landing sahifa (`/`).

- [ ] **Step 1: SiteHeader**

Create `src/components/site-header.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { ThemeToggle } from "@/components/theme-toggle";

export async function SiteHeader() {
  const t = await getTranslations("common");
  return (
    <header className="flex items-center justify-between px-6 py-4">
      <span className="text-xl font-bold text-brand">{t("appName")}</span>
      <ThemeToggle />
    </header>
  );
}
```

- [ ] **Step 2: Landing page**

`src/app/page.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";

export default async function Home() {
  const t = await getTranslations();
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {t("common.appName")}
        </h1>
        <p className="text-lg font-medium text-brand">{t("landing.tagline")}</p>
        <p className="text-balance text-muted-foreground">{t("landing.description")}</p>
        <Button size="lg" className="min-h-11 rounded-2xl px-8">
          {t("common.start")}
        </Button>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Qo'lda tekshirish**

Run: `pnpm dev`, `http://localhost:3000` oching.
Expected: "Ilmify" sarlavhasi, tagline, tavsif, "Boshlash" tugmasi ko'rinadi; ThemeToggle ishlaydi (yorug'/qorong'i/tizim); barcha matn o'zbekcha.

- [ ] **Step 4: Build tasdig'i**

Run: `pnpm build`
Expected: xatosiz.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add landing page with header and theme toggle"
```

---

### Task 6: PWA — manifest, ikonkalar, Serwist SW, offline sahifa

**Files:**
- Create: `src/app/manifest.ts`, `src/app/sw.ts`, `src/app/~offline/page.tsx`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/maskable-512.png`
- Modify: `next.config.ts` (Serwist bilan o'rash), `messages/uz.json` (offline matni), `tsconfig.json` (WebWorker lib), `.gitignore` (`public/sw*`)

**Interfaces:**
- Consumes: `@serwist/next`, `serwist`.
- Produces: `/manifest.webmanifest` (Next `manifest.ts` orqali), registratsiya qilingan service worker, `/~offline` fallback sahifa.

- [ ] **Step 1: Serwist o'rnatish**

Run: `pnpm add @serwist/next && pnpm add -D serwist`

- [ ] **Step 2: Ikonkalar**

`public/icons/` ga 3 ta PNG joylang: `icon-192.png` (192×192), `icon-512.png` (512×512), `maskable-512.png` (512×512, xavfsiz zona bilan). Placeholder sifatida brend rangdagi "I" harfli oddiy kvadrat ikonka yarating (masalan ImageMagick):
```bash
mkdir -p public/icons
command -v magick >/dev/null 2>&1 && GEN="magick" || GEN="convert"
$GEN -size 512x512 xc:'#5b21b6' -gravity center -pointsize 320 -fill white -annotate 0 'I' public/icons/icon-512.png
$GEN public/icons/icon-512.png -resize 192x192 public/icons/icon-192.png
cp public/icons/icon-512.png public/icons/maskable-512.png
```
(ImageMagick yo'q bo'lsa: har qanday 192/512 PNG placeholder qo'ying — muhimi fayllar mavjud bo'lsin.)

- [ ] **Step 3: Manifest**

Create `src/app/manifest.ts`:
```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ilmify",
    short_name: "Ilmify",
    description: "Zamonaviy, AI bilan boyitilgan interval takrorlash",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#5b21b6",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
```

- [ ] **Step 4: Service worker manbasi**

Create `src/app/sw.ts`:
```ts
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [{ url: "/~offline", matcher: ({ request }) => request.destination === "document" }],
  },
});

serwist.addEventListeners();
```

- [ ] **Step 5: tsconfig WebWorker lib**

`tsconfig.json` `compilerOptions.lib` ga `"webworker"` qo'shing (masalan `["dom", "dom.iterable", "esnext", "webworker"]`). `include` ga `"src/app/sw.ts"` avtomatik kiradi (`src/**/*` orqali).

- [ ] **Step 6: next.config.ts ni Serwist bilan o'rash**

`next.config.ts` (next-intl bilan birga zanjir):
```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withSerwistInit from "@serwist/next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  /* mavjud config */
};

export default withSerwist(withNextIntl(nextConfig));
```

- [ ] **Step 7: Offline sahifa + matn**

`messages/uz.json` ga qo'shing:
```json
"offline": {
  "title": "Internet yo'q",
  "message": "Siz oflaynsiz. Ulanish qaytganda sahifa yangilanadi."
}
```
Create `src/app/~offline/page.tsx`:
```tsx
import { getTranslations } from "next-intl/server";

export default async function OfflinePage() {
  const t = await getTranslations("offline");
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted-foreground">{t("message")}</p>
    </div>
  );
}
```

- [ ] **Step 8: .gitignore ga SW build chiqishi**

`.gitignore` da `public/sw.js` va `public/sw.js.map` borligini tekshiring (bootstrap'da qo'shilgan bo'lishi mumkin, bo'lmasa qo'shing).

- [ ] **Step 9: Prod build'da PWA tasdig'i**

Run: `pnpm build && pnpm start`
Brauzerda oching → DevTools → Application → Manifest ("Ilmify" ko'rinadi) va Service Workers (registratsiya qilingan). Network → Offline qilib sahifani yangilang → `/~offline` fallback ko'rinadi.
Expected: manifest yuklanadi, SW faol, offline fallback ishlaydi.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add PWA support with manifest, Serwist SW and offline page"
```

---

### Task 7: Vitest + sanity unit-testlar

**Files:**
- Create: `vitest.config.ts`, `src/lib/utils.test.ts`, `src/i18n/config.test.ts`
- Modify: `package.json` (`test` skripti)

**Interfaces:**
- Consumes: `cn` (Task 2), `defaultLocale`/`locales` (Task 4).
- Produces: `pnpm test` buyrug'i, o'tadigan testlar.

- [ ] **Step 1: Vitest o'rnatish**

Run: `pnpm add -D vitest`

- [ ] **Step 2: Vitest konfig**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": resolve(__dirname, "./src") },
  },
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 3: Failing test — cn()**

Create `src/lib/utils.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });
  it("resolves conflicting tailwind classes (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
  it("drops falsy values", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c");
  });
});
```

- [ ] **Step 4: Failing test — i18n config**

Create `src/i18n/config.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { defaultLocale, locales } from "@/i18n/config";

describe("i18n config", () => {
  it("default locale is uz", () => {
    expect(defaultLocale).toBe("uz");
  });
  it("default locale is included in locales", () => {
    expect(locales).toContain(defaultLocale);
  });
});
```

- [ ] **Step 5: test skriptini qo'shish**

`package.json` `scripts` ga: `"test": "vitest run"`.

- [ ] **Step 6: Testlarni ishga tushirish**

Run: `pnpm test`
Expected: barcha testlar PASS (`cn` va `defaultLocale` allaqachon mavjud, shuning uchun yashil).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "test: add Vitest with cn and i18n config sanity tests"
```

---

## Self-Review

**Spec coverage (2026-07-02-ilmify-m0-skeleton-design.md ga qarshi):**
- DoD 1 (`pnpm dev`) → Task 1, 5. ✅
- DoD 2 (landing) → Task 5. ✅
- DoD 3 (dark/light/system) → Task 3. ✅
- DoD 4 (i18n, hard-code emas) → Task 4, 5. ✅
- DoD 5 (PWA manifest+SW+offline) → Task 6. ✅
- DoD 6 (brend tokenlari light/dark) → Task 3. ✅
- DoD 7 (responsive, 44px) → Global Constraints + Task 3/5 (`size-11`, `min-h-11`). ✅
- DoD 8 (strict, build) → Task 1 + har task build step. ✅
- Testlar (Vitest, cn + i18n) → Task 7. ✅
- Papka strukturasi (spec §4) → tasklararo yaratiladi (`src/i18n/`, `src/components/`, `messages/`, `src/app/sw.ts`, `~offline`). ✅
  - Eslatma: spec §4 da `manifest.webmanifest` fayl edi; reja Next'ning `manifest.ts` (dinamik) yondashuvidan foydalanadi — bir xil natija (`/manifest.webmanifest` marshruti), lekin idiomatik. `locale-switcher.tsx` M0'da o'tkazib yuborildi (bitta locale) — kelajakda ko'p til qo'shilganda keladi; bu YAGNI.

**Placeholder scan:** Kod bloklari to'liq; "TBD"/"TODO" yo'q. Ikonka generatsiyasi ImageMagick fallback bilan aniq. ✅

**Type consistency:** `cn`, `ThemeProvider`, `ThemeToggle`, `SiteHeader`, `defaultLocale`, `locales`, `getTranslations`/`useTranslations` nomlari tasklararo mos. i18n kalitlari (`common.appName`, `common.start`, `landing.*`, `theme.*`, `offline.*`) `messages/uz.json` da e'lon qilingan va ishlatilgan joyga mos. ✅

**Chetlanish eslatmasi:** `locale-switcher.tsx` (spec §4 da bor) M0'da qurilmaydi — bitta locale bo'lgani uchun kerak emas (YAGNI). Ko'p til qo'shilganda alohida task bo'ladi.
