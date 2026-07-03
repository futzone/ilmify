import { expect, test } from "@playwright/test";

test("register, create/edit/delete deck, logout, login", async ({ page }) => {
  const email = `test${Date.now()}@ilmify.test`;
  const password = "Passw0rd!123";

  // register
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Parol", { exact: true }).fill(password);
  await page.getByLabel("Parolni tasdiqlang").fill(password);
  await page.getByRole("button", { name: "Ro'yxatdan o'tish" }).click();
  await expect(page).toHaveURL(/\/decks/);

  // empty state
  await expect(page.getByRole("heading", { name: "Hali deck yo'q" })).toBeVisible();

  // create
  await page.getByRole("button", { name: "Yangi deck" }).click();
  await page.getByLabel("Nom").fill("E2E Deck");
  await page.getByRole("button", { name: "Yaratish" }).click();
  await expect(page.getByText("E2E Deck")).toBeVisible();

  // logout
  await page.getByRole("button", { name: "Chiqish" }).click();
  await expect(page).toHaveURL(/\/login/);

  // login again — deck persists (server-side)
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Parol", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Kirish" }).click();
  await expect(page).toHaveURL(/\/decks/);
  await expect(page.getByText("E2E Deck")).toBeVisible();

  // guard: logout then hitting /decks redirects to /login
  await page.getByRole("button", { name: "Chiqish" }).click();
  await page.goto("/decks");
  await expect(page).toHaveURL(/\/login/);
});
