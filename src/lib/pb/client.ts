import PocketBase from "pocketbase";

const url = process.env.NEXT_PUBLIC_POCKETBASE_URL;
if (!url) throw new Error("NEXT_PUBLIC_POCKETBASE_URL is not set");

export const pb = new PocketBase(url);
pb.autoCancellation(false); // TanStack Query bir nechta so'rovni parallel yuborishi mumkin
