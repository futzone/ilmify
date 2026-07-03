# Ilmify M2 (Notes/Cards + Editor) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deck ichida rich-text note'lar yaratish va ulardan (Basic / Basic-reversed / Cloze) kartalarni klient-side generatsiya qilib PocketBase'ga yozish; `/decks/[deckId]` deck-detail sahifasi bilan.

**Architecture:** PocketBase online-first (yangi `ilmify_notes` + `ilmify_cards` kolleksiyalar, owner RLS, cascade). Sof mantiq (`cloze.ts`, `card-generation.ts`) Vitest bilan TDD. Tiptap rich editor + custom cloze mark. TanStack Query server-state. Karta generatsiyasi klientda; note+cards ketma-ket yoziladi (xatoda kompensatsiya). Tahrirlashda kartalar o'chirilib qayta yaratiladi.

**Tech Stack:** Next.js 16, React 19, TS strict, PocketBase SDK, TanStack Query, Tiptap (@tiptap/react, @tiptap/starter-kit, @tiptap/pm, @tiptap/core), next-intl, shadcn/Base-UI, Vitest, Playwright.

## Global Constraints

- pnpm via `npx pnpm@latest ...`. TS strict.
- **PocketBase:** `https://admin.imlogo.uz`. Faqat `ilmify_` prefiksli YANGI kolleksiyalar; mavjudlarga (`users`/`dictations`/`app`/`ilmify_users`/`ilmify_decks`) TEGILMAYDI. Setup idempotent. Superadmin creds faqat `.env.local` (gitignore) + `node --env-file`; hech qachon commit/prompt'da emas. Global PB sozlamalari (batch va h.k.) o'zgartirilmaydi.
- **RLS:** har kolleksiya `@request.auth.id != "" && owner = @request.auth.id`.
- Dexie yo'q (olib tashlangan). Data faqat client komponentlarda (PB SDK), `page.tsx` server komponentlar DB import qilmaydi.
- UI matni `messages/uz.json` `notes` namespace'idan; hard-code yo'q. Tap ≥44px. Base UI: `render`/`buttonVariants`, `asChild` yo'q.
- Note fields — Tiptap-schema HTML (script yo'q); render'da `dangerouslySetInnerHTML` schema-cheklangan HTML uchun xavfsiz.
- Har task oxirida commit; inglizcha `feat:`/`test:`/`chore:` prefiks.
- **Controller eslatmasi:** `.env.local` allaqachon mavjud (Backend & Auth slice'dan). Task 1 uni `node --env-file=.env.local` orqali o'qiydi; creds subagent prompt'iga qo'yilmaydi.

---

### Task 1: PocketBase notes/cards kolleksiyalari (pb-setup kengaytirish)

**Files:**
- Modify: `scripts/pb-setup.mjs` (ilmify_notes + ilmify_cards create bloklari qo'shish)

**Interfaces:**
- Produces: `ilmify_notes` va `ilmify_cards` kolleksiyalari (owner RLS, cascade relations) PB'da.

- [ ] **Step 1: setup skriptga notes/cards qo'shish**

`scripts/pb-setup.mjs` da, `ilmify_decks` blokidan keyin, mavjud kolleksiyalarni qayta ro'yxatlab id'larni oling (`ilmify_users`, `ilmify_decks`), so'ng idempotent qo'shing:
```js
const cols2 = (await api("/api/collections?perPage=200", {}, token)).items;
const byName2 = Object.fromEntries(cols2.map((c) => [c.name, c]));
const usersId = byName2["ilmify_users"].id;
const decksId = byName2["ilmify_decks"].id;
const OWNER_RULE = '@request.auth.id != "" && owner = @request.auth.id';

// ilmify_notes
if (!byName2["ilmify_notes"]) {
  await api("/api/collections", { method: "POST", body: JSON.stringify({
    name: "ilmify_notes", type: "base",
    fields: [
      { name: "deck", type: "relation", required: true, maxSelect: 1, collectionId: decksId, cascadeDelete: true },
      { name: "noteType", type: "select", required: true, maxSelect: 1, values: ["basic","basicReversed","cloze"] },
      { name: "fields", type: "json", required: true },
      { name: "tags", type: "json", required: false },
      { name: "owner", type: "relation", required: true, maxSelect: 1, collectionId: usersId, cascadeDelete: true },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    listRule: OWNER_RULE, viewRule: OWNER_RULE, createRule: OWNER_RULE, updateRule: OWNER_RULE, deleteRule: OWNER_RULE,
  }) }, token);
  console.log("created ilmify_notes");
} else console.log("ilmify_notes exists, skip");

const notesId = (await api("/api/collections?perPage=200", {}, token)).items.find((c) => c.name === "ilmify_notes").id;

// ilmify_cards
if (!byName2["ilmify_cards"]) {
  await api("/api/collections", { method: "POST", body: JSON.stringify({
    name: "ilmify_cards", type: "base",
    fields: [
      { name: "note", type: "relation", required: true, maxSelect: 1, collectionId: notesId, cascadeDelete: true },
      { name: "deck", type: "relation", required: true, maxSelect: 1, collectionId: decksId, cascadeDelete: true },
      { name: "templateIndex", type: "number", required: false },
      { name: "clozeIndex", type: "number", required: false },
      { name: "owner", type: "relation", required: true, maxSelect: 1, collectionId: usersId, cascadeDelete: true },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    listRule: OWNER_RULE, viewRule: OWNER_RULE, createRule: OWNER_RULE, updateRule: OWNER_RULE, deleteRule: OWNER_RULE,
  }) }, token);
  console.log("created ilmify_cards");
} else console.log("ilmify_cards exists, skip");
```
(`number` maydonlar `required:false` — `templateIndex:0` "falsy" bo'lgani uchun PB required raqamda 0 ni rad etishi mumkin; `required:false` bilan 0 saqlanadi.)

- [ ] **Step 2: ishga tushirish**

Run: `node --env-file=.env.local scripts/pb-setup.mjs`
Expected: "created ilmify_notes", "created ilmify_cards" (yoki "skip"), "done". Agar 400 bo'lsa, mavjud `ilmify_decks` field formatini ko'rib moslang (Backend & Auth Task 1'dagi kabi). Mavjud kolleksiyalarga PATCH/DELETE YO'Q.

- [ ] **Step 3: tasdiqlash**

Run:
```bash
node --env-file=.env.local -e 'const P=process.env.PB_URL;(async()=>{const a=await(await fetch(P+"/api/collections/_superusers/auth-with-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({identity:process.env.PB_SUPERUSER_EMAIL,password:process.env.PB_SUPERUSER_PASSWORD})})).json();const c=(await(await fetch(P+"/api/collections?perPage=200",{headers:{Authorization:a.token}})).json()).items;console.log(c.filter(x=>x.name.startsWith("ilmify")).map(x=>x.name));})()'
```
Expected: `['ilmify_users','ilmify_decks','ilmify_notes','ilmify_cards']`.

- [ ] **Step 4: Commit**

```bash
git add scripts/pb-setup.mjs
git commit -m "chore: add ilmify_notes and ilmify_cards collections to setup"
```

---

### Task 2: Note/Card tiplari + zod

**Files:**
- Create: `src/lib/note-types.ts`, `src/lib/note-types.test.ts`

**Interfaces:**
- Produces: `NoteType`, `NoteFields`/`BasicFields`/`ClozeFields`, `Note`, `Card`, `CardSpec`, `NoteInput`, `noteInputSchema`, `mapRecordToNote`, `mapRecordToCard`.

- [ ] **Step 1: failing test**

Create `src/lib/note-types.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { noteInputSchema, mapRecordToNote } from "@/lib/note-types";

describe("noteInputSchema", () => {
  it("accepts a basic note", () => {
    const p = noteInputSchema.parse({ noteType: "basic", fields: { front: "<p>a</p>", back: "<p>b</p>" } });
    expect(p.noteType).toBe("basic");
  });
  it("accepts a cloze note", () => {
    const p = noteInputSchema.parse({ noteType: "cloze", fields: { text: "<p>x</p>" } });
    expect(p.noteType).toBe("cloze");
  });
  it("rejects an unknown note type", () => {
    expect(() => noteInputSchema.parse({ noteType: "typein", fields: {} })).toThrow();
  });
  it("defaults tags to []", () => {
    const p = noteInputSchema.parse({ noteType: "basic", fields: { front: "a", back: "b" } });
    expect(p.tags ?? []).toEqual([]);
  });
});

describe("mapRecordToNote", () => {
  it("maps a PB record", () => {
    const n = mapRecordToNote({ id: "n1", deck: "d1", noteType: "basic", fields: { front: "a", back: "b" }, tags: [], owner: "u1", created: "t", updated: "t" });
    expect(n.id).toBe("n1");
    expect(n.deck).toBe("d1");
    expect(n.fields).toEqual({ front: "a", back: "b" });
  });
});
```

- [ ] **Step 2: run (fail)** — `npx pnpm@latest test src/lib/note-types.test.ts` → FAIL (module missing).

- [ ] **Step 3: note-types.ts**

Create `src/lib/note-types.ts`:
```ts
import { z } from "zod";
import type { RecordModel } from "pocketbase";

export const NOTE_TYPES = ["basic", "basicReversed", "cloze"] as const;
export type NoteType = (typeof NOTE_TYPES)[number];

export type BasicFields = { front: string; back: string };
export type ClozeFields = { text: string };
export type NoteFields = BasicFields | ClozeFields;

export type Note = {
  id: string; deck: string; noteType: NoteType;
  fields: NoteFields; tags: string[];
  owner: string; created: string; updated: string;
};

export type Card = {
  id: string; note: string; deck: string;
  templateIndex: number; clozeIndex: number | null;
  owner: string; created: string; updated: string;
};

export type CardSpec = { templateIndex: number; clozeIndex: number | null };

const basicFields = z.object({ front: z.string(), back: z.string() });
const clozeFields = z.object({ text: z.string() });

export const noteInputSchema = z.discriminatedUnion("noteType", [
  z.object({ noteType: z.literal("basic"), fields: basicFields, tags: z.array(z.string()).optional() }),
  z.object({ noteType: z.literal("basicReversed"), fields: basicFields, tags: z.array(z.string()).optional() }),
  z.object({ noteType: z.literal("cloze"), fields: clozeFields, tags: z.array(z.string()).optional() }),
]);
export type NoteInput = z.infer<typeof noteInputSchema>;

export function mapRecordToNote(r: RecordModel): Note {
  return { id: r.id, deck: r.deck, noteType: r.noteType, fields: r.fields, tags: r.tags ?? [], owner: r.owner, created: r.created, updated: r.updated };
}

export function mapRecordToCard(r: RecordModel): Card {
  return { id: r.id, note: r.note, deck: r.deck, templateIndex: r.templateIndex ?? 0, clozeIndex: r.clozeIndex ?? null, owner: r.owner, created: r.created, updated: r.updated };
}
```
(Agar zod versiyasi `discriminatedUnion`da farq qilsa, minimal moslang — xatti-harakat: noteType 3 qiymatdan biri, basic/reversed → {front,back}, cloze → {text}.)

- [ ] **Step 4: run (pass)** — `npx pnpm@latest test src/lib/note-types.test.ts` → PASS.

- [ ] **Step 5: Commit**
```bash
git add src/lib/note-types.ts src/lib/note-types.test.ts
git commit -m "feat: add note and card types with zod schema"
```

---

### Task 3: Cloze parsing (pure, TDD)

**Files:**
- Create: `src/lib/cloze.ts`, `src/lib/cloze.test.ts`

**Interfaces:**
- Produces: `extractClozeIndices(html: string): number[]`, `renderClozeCard(html: string, index: number): { front: string; back: string }`.

- [ ] **Step 1: failing test**

Create `src/lib/cloze.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { extractClozeIndices, renderClozeCard } from "@/lib/cloze";

const html = '<p>Poytaxt <span data-cloze="1">Toshkent</span>, aholi <span data-cloze="2">3 mln</span>.</p>';

describe("extractClozeIndices", () => {
  it("returns distinct sorted indices", () => {
    expect(extractClozeIndices(html)).toEqual([1, 2]);
  });
  it("dedupes repeated indices", () => {
    expect(extractClozeIndices('<span data-cloze="1">a</span> <span data-cloze="1">b</span>')).toEqual([1]);
  });
  it("returns [] when no cloze", () => {
    expect(extractClozeIndices("<p>hello</p>")).toEqual([]);
  });
});

describe("renderClozeCard", () => {
  it("blanks the target index, reveals others (front)", () => {
    const { front } = renderClozeCard(html, 1);
    expect(front).toContain("[...]");
    expect(front).not.toContain("Toshkent");
    expect(front).toContain("3 mln"); // other cloze revealed
    expect(front).not.toContain("data-cloze");
  });
  it("reveals all on back", () => {
    const { back } = renderClozeCard(html, 1);
    expect(back).toContain("Toshkent");
    expect(back).toContain("3 mln");
    expect(back).not.toContain("data-cloze");
  });
  it("blanks all spans sharing the target index", () => {
    const h = '<span data-cloze="1">a</span> <span data-cloze="1">b</span>';
    const { front } = renderClozeCard(h, 1);
    expect(front).not.toContain(">a<");
    expect(front).not.toContain(">b<");
  });
});
```

- [ ] **Step 2: run (fail)** — `npx pnpm@latest test src/lib/cloze.test.ts` → FAIL.

- [ ] **Step 3: cloze.ts**

Create `src/lib/cloze.ts`:
```ts
// Tiptap cloze mark serializes to <span data-cloze="N">...</span> (non-nested cloze spans).
const CLOZE_RE = /<span data-cloze="(\d+)">(.*?)<\/span>/g;

export function extractClozeIndices(html: string): number[] {
  const set = new Set<number>();
  for (const m of html.matchAll(CLOZE_RE)) set.add(Number(m[1]));
  return [...set].sort((a, b) => a - b);
}

export function renderClozeCard(html: string, index: number): { front: string; back: string } {
  const front = html.replace(CLOZE_RE, (_full, n, inner) =>
    Number(n) === index ? "[...]" : inner,
  );
  const back = html.replace(CLOZE_RE, (_full, _n, inner) => inner);
  return { front, back };
}
```

- [ ] **Step 4: run (pass)** — `npx pnpm@latest test src/lib/cloze.test.ts` → PASS.

- [ ] **Step 5: Commit**
```bash
git add src/lib/cloze.ts src/lib/cloze.test.ts
git commit -m "feat: add cloze parsing and card rendering"
```

---

### Task 4: Card generation (pure, TDD)

**Files:**
- Create: `src/lib/card-generation.ts`, `src/lib/card-generation.test.ts`

**Interfaces:**
- Consumes: `NoteType`, `NoteFields`, `CardSpec` (Task 2), `extractClozeIndices` (Task 3).
- Produces: `generateCards(noteType: NoteType, fields: NoteFields): CardSpec[]`.

- [ ] **Step 1: failing test**

Create `src/lib/card-generation.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { generateCards } from "@/lib/card-generation";

describe("generateCards", () => {
  it("basic → 1 card", () => {
    expect(generateCards("basic", { front: "a", back: "b" })).toEqual([{ templateIndex: 0, clozeIndex: null }]);
  });
  it("basicReversed → 2 cards", () => {
    expect(generateCards("basicReversed", { front: "a", back: "b" })).toEqual([
      { templateIndex: 0, clozeIndex: null },
      { templateIndex: 1, clozeIndex: null },
    ]);
  });
  it("cloze → one card per distinct index", () => {
    const fields = { text: '<span data-cloze="1">a</span> <span data-cloze="2">b</span>' };
    expect(generateCards("cloze", fields)).toEqual([
      { templateIndex: 0, clozeIndex: 1 },
      { templateIndex: 0, clozeIndex: 2 },
    ]);
  });
  it("cloze with no marks → []", () => {
    expect(generateCards("cloze", { text: "<p>no cloze</p>" })).toEqual([]);
  });
});
```

- [ ] **Step 2: run (fail)** — `npx pnpm@latest test src/lib/card-generation.test.ts` → FAIL.

- [ ] **Step 3: card-generation.ts**

Create `src/lib/card-generation.ts`:
```ts
import type { CardSpec, NoteFields, NoteType } from "@/lib/note-types";
import { extractClozeIndices } from "@/lib/cloze";

export function generateCards(noteType: NoteType, fields: NoteFields): CardSpec[] {
  if (noteType === "basic") return [{ templateIndex: 0, clozeIndex: null }];
  if (noteType === "basicReversed")
    return [
      { templateIndex: 0, clozeIndex: null },
      { templateIndex: 1, clozeIndex: null },
    ];
  // cloze
  const text = (fields as { text: string }).text;
  return extractClozeIndices(text).map((i) => ({ templateIndex: 0, clozeIndex: i }));
}
```

- [ ] **Step 4: run (pass)** — `npx pnpm@latest test src/lib/card-generation.test.ts` → PASS.

- [ ] **Step 5: Commit**
```bash
git add src/lib/card-generation.ts src/lib/card-generation.test.ts
git commit -m "feat: add card generation from note type and fields"
```

---

### Task 5: Tiptap rich editor + cloze mark

**Files:**
- Create: `src/components/editor/cloze-mark.ts`, `src/components/editor/rich-text-editor.tsx`
- Modify: `package.json` (tiptap deps)

**Interfaces:**
- Produces: `ClozeMark` (Tiptap Mark), `<RichTextEditor value onChange showCloze />`.

- [ ] **Step 1: Tiptap o'rnatish**

Run: `npx pnpm@latest add @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/core`

- [ ] **Step 2: Cloze mark**

Create `src/components/editor/cloze-mark.ts`:
```ts
import { Mark, mergeAttributes } from "@tiptap/core";

export const ClozeMark = Mark.create({
  name: "cloze",
  addAttributes() {
    return {
      index: {
        default: 1,
        parseHTML: (el) => Number((el as HTMLElement).getAttribute("data-cloze")) || 1,
        renderHTML: (attrs) => ({ "data-cloze": String(attrs.index) }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-cloze]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "rounded bg-brand/15 px-0.5 text-brand" }), 0];
  },
  addCommands() {
    return {
      setCloze:
        (index: number) =>
        ({ commands }) =>
          commands.setMark(this.name, { index }),
    } as Partial<Record<string, unknown>> as never;
  },
});
```
(Eslatma: `setCloze` buyrug'i uchun tip kengaytmasi murakkab bo'lsa, `editor.chain().setMark("cloze", { index }).run()` ni to'g'ridan-to'g'ri toolbar'da ishlating va `addCommands` ni soddalashtiring/olib tashlang.)

- [ ] **Step 3: RichTextEditor**

Create `src/components/editor/rich-text-editor.tsx`:
```tsx
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { Bold, Italic, List, SquareDashed } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ClozeMark } from "./cloze-mark";

type Props = {
  value: string;
  onChange: (html: string) => void;
  showCloze?: boolean;
  ariaLabel?: string;
};

export function RichTextEditor({ value, onChange, showCloze, ariaLabel }: Props) {
  const editor = useEditor({
    extensions: [StarterKit, ClozeMark],
    content: value,
    immediatelyRender: false,
    editorProps: { attributes: { class: "min-h-24 rounded-md border p-3 focus:outline-none", "aria-label": ariaLabel ?? "" } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // tashqi value o'zgarsa (edit rejim) sinxronlash
  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value, { emitUpdate: false });
  }, [value, editor]);

  if (!editor) return null;

  function nextClozeIndex(): number {
    const html = editor!.getHTML();
    const used = [...html.matchAll(/data-cloze="(\d+)"/g)].map((m) => Number(m[1]));
    return used.length ? Math.max(...used) + 1 : 1;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        <Button type="button" size="icon" variant={editor.isActive("bold") ? "secondary" : "ghost"} className="size-11" aria-label="Qalin" onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="size-4" /></Button>
        <Button type="button" size="icon" variant={editor.isActive("italic") ? "secondary" : "ghost"} className="size-11" aria-label="Kursiv" onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="size-4" /></Button>
        <Button type="button" size="icon" variant={editor.isActive("bulletList") ? "secondary" : "ghost"} className="size-11" aria-label="Ro'yxat" onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="size-4" /></Button>
        {showCloze && (
          <Button type="button" size="icon" variant="ghost" className="size-11" aria-label="Cloze" onClick={() => editor.chain().focus().setMark("cloze", { index: nextClozeIndex() }).run()}><SquareDashed className="size-4" /></Button>
        )}
      </div>
      <EditorContent editor={editor} className={cn("text-sm")} />
    </div>
  );
}
```

- [ ] **Step 4: build (tsc)** — `npx pnpm@latest exec tsc --noEmit` — yangi editor fayllarida xato yo'q. (Agar `setMark("cloze", ...)` tip xatosi bersa, `ClozeMark`ni to'g'ri ro'yxatdan o'tkazing yoki `editor.chain().focus().setMark("cloze", { index })` ni `as any`siz ishlating — StarterKit + ClozeMark registratsiyasi bilan tip mavjud bo'lishi kerak.)

- [ ] **Step 5: Commit**
```bash
git add src/components/editor package.json pnpm-lock.yaml
git commit -m "feat: add Tiptap rich text editor with cloze mark"
```

---

### Task 6: Notes/Cards repository + TanStack Query

**Files:**
- Create: `src/lib/pb/notes.ts`, `src/lib/pb/cards.ts`, `src/lib/pb/note-queries.ts`

**Interfaces:**
- Consumes: `pb` (`@/lib/pb/client`), `Note`/`Card`/`NoteInput`/`noteInputSchema`/`mapRecordToNote`/`mapRecordToCard` (Task 2), `generateCards` (Task 4).
- Produces: repository funksiyalari + `useNotes`/`useCreateNote`/`useUpdateNote`/`useDeleteNote`/`useDeckCardCount`.

- [ ] **Step 1: notes repository**

Create `src/lib/pb/notes.ts`:
```ts
import { pb } from "@/lib/pb/client";
import { type Note, type NoteInput, noteInputSchema, mapRecordToNote } from "@/lib/note-types";
import { generateCards } from "@/lib/card-generation";

const NOTES = "ilmify_notes";
const CARDS = "ilmify_cards";

function authId(): string {
  const id = pb.authStore.record?.id;
  if (!id) throw new Error("Not authenticated");
  return id;
}

async function writeCards(noteId: string, deckId: string, owner: string, input: NoteInput) {
  const specs = generateCards(input.noteType, input.fields);
  for (const s of specs) {
    await pb.collection(CARDS).create({ note: noteId, deck: deckId, templateIndex: s.templateIndex, clozeIndex: s.clozeIndex ?? null, owner });
  }
}

export async function listNotes(deckId: string): Promise<Note[]> {
  const records = await pb.collection(NOTES).getFullList({ filter: `deck = "${deckId}"`, sort: "-updated" });
  return records.map(mapRecordToNote);
}

export async function createNote(deckId: string, input: NoteInput): Promise<Note> {
  const parsed = noteInputSchema.parse(input);
  const owner = authId();
  const record = await pb.collection(NOTES).create({ deck: deckId, noteType: parsed.noteType, fields: parsed.fields, tags: parsed.tags ?? [], owner });
  try {
    await writeCards(record.id, deckId, owner, parsed);
  } catch (e) {
    await pb.collection(NOTES).delete(record.id).catch(() => {}); // compensate
    throw e;
  }
  return mapRecordToNote(record);
}

export async function updateNote(id: string, deckId: string, input: NoteInput): Promise<Note> {
  const parsed = noteInputSchema.parse(input);
  const owner = authId();
  const record = await pb.collection(NOTES).update(id, { noteType: parsed.noteType, fields: parsed.fields, tags: parsed.tags ?? [] });
  const old = await pb.collection(CARDS).getFullList({ filter: `note = "${id}"` });
  for (const c of old) await pb.collection(CARDS).delete(c.id);
  await writeCards(id, deckId, owner, parsed);
  return mapRecordToNote(record);
}

export async function deleteNote(id: string): Promise<void> {
  await pb.collection(NOTES).delete(id); // cards cascade
}
```

- [ ] **Step 2: cards repository**

Create `src/lib/pb/cards.ts`:
```ts
import { pb } from "@/lib/pb/client";
import { type Card, mapRecordToCard } from "@/lib/note-types";

const CARDS = "ilmify_cards";

export async function listCardsByNote(noteId: string): Promise<Card[]> {
  const records = await pb.collection(CARDS).getFullList({ filter: `note = "${noteId}"`, sort: "templateIndex,clozeIndex" });
  return records.map(mapRecordToCard);
}

export async function countCardsByDeck(deckId: string): Promise<number> {
  const res = await pb.collection(CARDS).getList(1, 1, { filter: `deck = "${deckId}"` });
  return res.totalItems;
}
```

- [ ] **Step 3: query hooks**

Create `src/lib/pb/note-queries.ts`:
```ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createNote, deleteNote, listNotes, updateNote } from "@/lib/pb/notes";
import { countCardsByDeck } from "@/lib/pb/cards";
import type { NoteInput } from "@/lib/note-types";

export function useNotes(deckId: string) {
  return useQuery({ queryKey: ["notes", deckId], queryFn: () => listNotes(deckId) });
}

export function useDeckCardCount(deckId: string) {
  return useQuery({ queryKey: ["deckCardCount", deckId], queryFn: () => countCardsByDeck(deckId) });
}

export function useCreateNote(deckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NoteInput) => createNote(deckId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes", deckId] });
      qc.invalidateQueries({ queryKey: ["deckCardCount", deckId] });
    },
  });
}

export function useUpdateNote(deckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: NoteInput }) => updateNote(id, deckId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes", deckId] });
      qc.invalidateQueries({ queryKey: ["deckCardCount", deckId] });
    },
  });
}

export function useDeleteNote(deckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteNote(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes", deckId] });
      qc.invalidateQueries({ queryKey: ["deckCardCount", deckId] });
    },
  });
}
```

- [ ] **Step 4: tsc** — `npx pnpm@latest exec tsc --noEmit` — yangi fayllarda xato yo'q.

- [ ] **Step 5: Commit**
```bash
git add src/lib/pb/notes.ts src/lib/pb/cards.ts src/lib/pb/note-queries.ts
git commit -m "feat: add notes/cards PocketBase repository and query hooks"
```

---

### Task 7: Deck detail route + note browse + card count

**Files:**
- Create: `src/app/decks/[deckId]/page.tsx`, `src/app/decks/[deckId]/_components/deck-detail-client.tsx`, `.../note-list.tsx`, `.../note-card.tsx`
- Modify: `src/app/decks/_components/deck-card.tsx` (real card count + Link), `messages/uz.json` (`notes` namespace)

**Interfaces:**
- Consumes: `useNotes`/`useDeckCardCount` (Task 6); shadcn Card/Button/DropdownMenu.
- Produces: deck-detail sahifasi (note browse). Note editor Task 8'da ulanadi (bu task'da "Yangi karta" tugmasi placeholder yoki Task 8 bilan birga).

- [ ] **Step 1: i18n `notes` namespace**

`messages/uz.json` ga qo'shing:
```json
"notes": {
  "title": "Kartalar",
  "new": "Yangi karta",
  "back": "Orqaga",
  "cardCount": "{count} karta",
  "empty": { "title": "Hali karta yo'q", "description": "Birinchi kartangizni qo'shing.", "cta": "Karta qo'shish" },
  "type": { "basic": "Oddiy", "basicReversed": "Oddiy + teskari", "cloze": "Cloze" },
  "menu": { "open": "Amallar", "edit": "Tahrirlash", "delete": "O'chirish" },
  "errors": { "loadFailed": "Kartalarni yuklab bo'lmadi." },
  "form": {
    "createTitle": "Yangi karta", "editTitle": "Kartani tahrirlash",
    "typeLabel": "Tur", "front": "Old tomon", "back": "Orqa tomon", "clozeText": "Matn (cloze belgilang)",
    "preview": "Ko'rinish", "cancel": "Bekor qilish", "save": "Saqlash", "create": "Yaratish"
  },
  "delete": { "title": "Kartani o'chirish", "description": "Bu note va uning kartalari o'chiriladi.", "cancel": "Bekor qilish", "confirm": "O'chirish" },
  "validation": { "frontRequired": "Old tomon bo'sh bo'lmasligi kerak", "clozeRequired": "Kamida bitta cloze belgilang" }
}
```

- [ ] **Step 2: NoteCard (display)**

Create `src/app/decks/[deckId]/_components/note-card.tsx`:
```tsx
"use client";
import { MoreVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Note } from "@/lib/note-types";

function plain(html: string): string { return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function summary(note: Note): string {
  const f = note.fields as Record<string, string>;
  return plain(f.front ?? f.text ?? "");
}

export function NoteCard({ note, onEdit, onDelete }: { note: Note; onEdit: (n: Note) => void; onDelete: (n: Note) => void }) {
  const t = useTranslations("notes");
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{t(`type.${note.noteType}`)}</span>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="ml-auto size-11" aria-label={t("menu.open")}><MoreVertical className="size-5" /></Button>} />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(note)}>{t("menu.edit")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(note)}>{t("menu.delete")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent><p className="line-clamp-2 text-sm text-muted-foreground">{summary(note)}</p></CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: NoteList (useNotes)**

Create `src/app/decks/[deckId]/_components/note-list.tsx` — `useNotes(deckId)` bilan `deck-list.tsx` naqshini kuzatib (isLoading→skeleton, error→`t("errors.loadFailed")`, empty→empty-state CTA, data→grid of NoteCard). Props: `deckId`, `onCreate`, `onEdit`, `onDelete`.

- [ ] **Step 4: DeckDetailClient**

Create `src/app/decks/[deckId]/_components/deck-detail-client.tsx` — orkestratsiya: header (title, "Yangi karta", orqaga Link `/decks`), NoteList, va (Task 8'da) note editor + delete dialog holati. Bu task'da editor dialogsiz — "Yangi karta"/edit/delete Task 8'da ulanadi; hozircha tugmalar mavjud (Task 8 wiring). `deckId`ni `useParams` yoki props'dan oling.

- [ ] **Step 5: page.tsx (server, AuthGuard)**

Create `src/app/decks/[deckId]/page.tsx`:
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
(Next 16: `params` — Promise; `await` qiling.)

- [ ] **Step 6: DeckCard — real count + link**

`src/app/decks/_components/deck-card.tsx` — `useDeckCardCount(deck.id)` bilan `t("cardCount", { count })` (0 o'rniga), va kartani `next/link` bilan `/decks/${deck.id}`ga o'rang (⋯ menyu tugmasi link ichida event.stopPropagation bilan yoki menyu link tashqarisida). `decks.cardCount` o'rniga `notes.cardCount` ishlating yoki `decks` namespace'da qoldiring — mavjud kalitni ishlating.

- [ ] **Step 7: build** — `npx pnpm@latest build` — xatosiz (agar Task 8 editor hali yo'q bo'lsa, "Yangi karta"/edit/delete no-op yoki placeholder bo'lishi mumkin, lekin build o'tishi shart). `npx pnpm@latest test` — yashil.

- [ ] **Step 8: Commit**
```bash
git add src/app/decks messages/uz.json
git commit -m "feat: add deck detail page with note browse and card count"
```

---

### Task 8: Note editor dialog (create/edit/delete) + preview

**Files:**
- Create: `src/app/decks/[deckId]/_components/note-editor-dialog.tsx`, `.../note-preview.tsx`, `.../delete-note-dialog.tsx`
- Modify: `deck-detail-client.tsx` (editor/delete holati va wiring)

**Interfaces:**
- Consumes: `useCreateNote`/`useUpdateNote`/`useDeleteNote` (Task 6), `RichTextEditor` (Task 5), `generateCards`/`renderClozeCard` (Task 3/4), `noteInputSchema`/`NoteType`/`NoteInput`/`Note` (Task 2), shadcn Dialog/AlertDialog.

- [ ] **Step 1: NotePreview**

Create `note-preview.tsx` — joriy `noteType`+`fields`dan kartalar ro'yxatini ko'rsatadi:
- basic → 1 karta: front=fields.front, back=fields.back.
- basicReversed → 2 karta (front/back va back/front).
- cloze → `extractClozeIndices` bo'yicha har biri `renderClozeCard(text, i)`.
Har karta front/back HTML'ini `dangerouslySetInnerHTML` bilan (schema-xavfsiz). Cloze yo'q bo'lsa `t("validation.clozeRequired")` eslatmasi.

- [ ] **Step 2: NoteEditorDialog**

Create `note-editor-dialog.tsx` — shadcn `Dialog`; holat: `noteType`, `fields` (front/back yoki text). Tur tanlagich (3 tugma/tabs). Maydonlar turga qarab `RichTextEditor` (cloze uchun `showCloze`). `NotePreview` ko'rsatiladi. Submit: validatsiya (basic: front bo'sh emas → `frontRequired`; cloze: `extractClozeIndices` bo'sh emas → `clozeRequired`) → `onSubmit(NoteInput)` → yopiladi. Edit rejim: `note?` bilan to'ldiriladi (turi + fields). Props: `open`, `onOpenChange`, `note?`, `onSubmit`.

- [ ] **Step 3: DeleteNoteDialog**

Create `delete-note-dialog.tsx` — `delete-deck-dialog.tsx` naqshi: AlertDialog, `t("notes.delete.*")`, `onConfirm`.

- [ ] **Step 4: DeckDetailClient wiring**

`deck-detail-client.tsx` — `useCreateNote`/`useUpdateNote`/`useDeleteNote(deckId)`; create/edit dialog holati (`editing?: Note`), delete holati (`deleting: Note | null`); `handleSubmit` (editing ? updateM.mutateAsync({id,input}) : createM.mutateAsync(input)); `handleDelete` (deleteM.mutateAsync). NoteList'ga `onCreate`/`onEdit`/`onDelete` uzatiladi.

- [ ] **Step 5: build + manual** — `npx pnpm@latest build` xatosiz; `npx pnpm@latest dev` da: deck oching → Yangi karta → Basic/Reversed/Cloze yarating, preview kartalarni ko'rsatadi → saqlang → ro'yxatda paydo bo'ladi → tahrirlang → o'chiring.

- [ ] **Step 6: Commit**
```bash
git add src/app/decks
git commit -m "feat: add note editor dialog with card preview and delete"
```

---

### Task 9: E2E + yakuniy

**Files:**
- Create: `e2e/notes-cards.spec.ts`
- Modify: `package.json` (agar kerak)

**Interfaces:**
- Consumes: to'liq ilova + jonli PB.

- [ ] **Step 1: E2E test**

Create `e2e/notes-cards.spec.ts` (Playwright) — register/login (auth-decks.spec naqshi), deck yaratish, deck ochish (`/decks/[deckId]`), Basic note yaratish (preview 1 karta) → saqlash → ro'yxatda paydo bo'ladi, Cloze note yaratish (2 cloze belgilash → preview 2 karta), note tahrirlash, o'chirish, va deck kartasida karta soni yangilanishini tekshirish. Selektorlarni haqiqiy DOM'ga moslang (labels: "Old tomon", "Orqa tomon", "Matn (cloze belgilang)", tugmalar "Yaratish"/"Saqlash"/"O'chirish", tur tugmalari "Oddiy"/"Oddiy + teskari"/"Cloze"). Cloze mark tugmasi (aria-label "Cloze") matnni belgilagach bosiladi — Playwright'da matnni tanlash uchun `page.keyboard` yoki triple-click ishlating.

- [ ] **Step 2: E2E ishga tushirish** — `npx pnpm@latest exec playwright test e2e/notes-cards.spec.ts` → passed. Selektorlar mos kelmasa test faylni jonli sahifaga qarab tuzating (test haqiqatan o'tishi shart).

- [ ] **Step 3: yakuniy build + test** — `npx pnpm@latest build && npx pnpm@latest test && npx pnpm@latest lint` — hammasi toza.

- [ ] **Step 4: Commit**
```bash
git add -A
git commit -m "test: add e2e for note/card lifecycle"
```

---

## Self-Review

**Spec coverage (2026-07-03-ilmify-m2-notes-cards-design.md):**
- §3 kolleksiyalar → Task 1. ✅
- §4 tiplar → Task 2. ✅
- §5 sof mantiq (cloze, generation, cloze mark) → Task 3, 4, 5. ✅
- §6 repository + query → Task 6. ✅
- §7 UI (deck detail, editor, preview, card count) → Task 7, 8. ✅
- §8 xatolar (validatsiya, kompensatsiya, qayta-gen) → Task 6 (createNote compensate, updateNote regen), Task 8 (validation). ✅
- §9 test (unit + E2E) → Task 2/3/4 (unit), Task 9 (E2E). ✅
- §12 DoD 1-9 → tasklararo. ✅

**Placeholder scan:** Sof-mantiq va repo tasklari to'liq kod bilan. UI tasklari (7 §3/4, 8 §2/3) tuzilma + naqsh ko'rsatmasi bilan (M1/deck UI naqshini kuzatadi) — to'liq verbatim kod emas, lekin komponent shakli, props, i18n kalitlari va xatti-harakat aniq belgilangan; subagent mavjud deck UI naqshiga ergashadi. Tiptap `setCloze`/tip nozikligi uchun fallback ko'rsatma bor.

**Type consistency:** `NoteType`/`NoteFields`/`Note`/`Card`/`CardSpec`/`NoteInput`/`noteInputSchema`/`mapRecordToNote`/`mapRecordToCard`, `extractClozeIndices`/`renderClozeCard`, `generateCards`, `listNotes/createNote/updateNote/deleteNote`, `listCardsByNote/countCardsByDeck`, `useNotes/useCreateNote/useUpdateNote/useDeleteNote/useDeckCardCount` — tasklararo izchil.

**Eslatma (fresh session ijrosi):** Task 1 `.env.local` (mavjud) ni `node --env-file` orqali ishlatadi. Task 7/8 UI kod-og'ir — subagentlar mavjud `src/app/decks/_components/*` (deck UI) naqshini namuna sifatida ishlatishi kerak (bir xil shadcn/Base UI, i18n, tap-target konventsiyalari).
