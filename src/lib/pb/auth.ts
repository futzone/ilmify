import { pb } from "@/lib/pb/client";

export type AuthUser = { id: string; email: string; name: string };

export async function register(input: {
  email: string; password: string; passwordConfirm: string; name?: string;
}): Promise<void> {
  await pb.collection("ilmify_users").create({
    email: input.email,
    password: input.password,
    passwordConfirm: input.passwordConfirm,
    name: input.name ?? "",
  });
  await login(input.email, input.password);
}

export async function login(email: string, password: string): Promise<void> {
  await pb.collection("ilmify_users").authWithPassword(email, password);
}

export function logout(): void {
  pb.authStore.clear();
}

export function getCurrentUser(): AuthUser | null {
  const m = pb.authStore.record;
  if (!m) return null;
  return { id: m.id, email: m.email, name: m.name ?? "" };
}
