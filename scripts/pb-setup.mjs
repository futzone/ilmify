// Idempotent: creates ilmify_users (auth) + ilmify_decks (base). Never deletes/modifies existing.
// Run: node --env-file=.env.local scripts/pb-setup.mjs
const PB = process.env.PB_URL || process.env.NEXT_PUBLIC_POCKETBASE_URL;
const EMAIL = process.env.PB_SUPERUSER_EMAIL;
const PASSWORD = process.env.PB_SUPERUSER_PASSWORD;
if (!PB || !EMAIL || !PASSWORD) { console.error("Missing PB env"); process.exit(1); }

async function api(path, opts = {}, token) {
  const res = await fetch(`${PB}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: token } : {}), ...(opts.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} -> ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

const auth = await api("/api/collections/_superusers/auth-with-password", {
  method: "POST", body: JSON.stringify({ identity: EMAIL, password: PASSWORD }),
});
const token = auth.token;

const existing = await api("/api/collections?perPage=200", {}, token);
const byName = Object.fromEntries(existing.items.map((c) => [c.name, c]));

// 1. ilmify_users (auth)
if (!byName["ilmify_users"]) {
  await api("/api/collections", { method: "POST", body: JSON.stringify({
    name: "ilmify_users",
    type: "auth",
    fields: [{ name: "name", type: "text", required: false }],
    passwordAuth: { enabled: true, identityFields: ["email"] },
    createRule: "",                         // public registration
    listRule: "id = @request.auth.id",
    viewRule: "id = @request.auth.id",
    updateRule: "id = @request.auth.id",
    deleteRule: "id = @request.auth.id",
    authRule: "",                            // auto-confirm: auth allowed without verification
  }) }, token);
  console.log("created ilmify_users");
} else console.log("ilmify_users exists, skip");

const users = (await api("/api/collections?perPage=200", {}, token)).items.find((c) => c.name === "ilmify_users");

// 2. ilmify_decks (base)
if (!byName["ilmify_decks"]) {
  const OWNER_RULE = '@request.auth.id != "" && owner = @request.auth.id';
  await api("/api/collections", { method: "POST", body: JSON.stringify({
    name: "ilmify_decks",
    type: "base",
    fields: [
      { name: "name", type: "text", required: true, max: 60 },
      { name: "description", type: "text", required: false },
      { name: "color", type: "select", required: true, maxSelect: 1,
        values: ["purple","blue","green","amber","red","pink","teal","slate"] },
      { name: "owner", type: "relation", required: true, maxSelect: 1,
        collectionId: users.id, cascadeDelete: true },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    listRule: OWNER_RULE, viewRule: OWNER_RULE, createRule: OWNER_RULE,
    updateRule: OWNER_RULE, deleteRule: OWNER_RULE,
  }) }, token);
  console.log("created ilmify_decks");
} else console.log("ilmify_decks exists, skip");

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

console.log("done");
