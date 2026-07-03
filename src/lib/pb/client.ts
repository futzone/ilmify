import PocketBase from "pocketbase";

// Ommaviy PocketBase URL. Env-var qo'yilmagan build'larda (masalan CI'da
// statik prerender) yiqilmaslik uchun production nusxasiga fallback qiladi.
// Staging/lokal uchun NEXT_PUBLIC_POCKETBASE_URL bilan override qilinadi.
const url = process.env.NEXT_PUBLIC_POCKETBASE_URL ?? "https://admin.imlogo.uz";

export const pb = new PocketBase(url);
pb.autoCancellation(false); // TanStack Query bir nechta so'rovni parallel yuborishi mumkin
