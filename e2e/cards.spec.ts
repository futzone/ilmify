import { expect, test } from "@playwright/test";

test("card lifecycle: create, filter, study grading, analytics", async ({ page }) => {
  const email = `test${Date.now()}@ilmify.test`;
  const password = "Passw0rd!123";

  // register (fresh user, mirrors e2e/auth-decks.spec.ts)
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Parol", { exact: true }).fill(password);
  await page.getByLabel("Parolni tasdiqlang").fill(password);
  await page.getByRole("button", { name: "Ro'yxatdan o'tish" }).click();
  await expect(page).toHaveURL(/\/decks/);

  // create deck
  await page.getByRole("button", { name: "Yangi deck" }).click();
  const deckName = `E2E Cards ${Date.now()}`;
  await page.getByLabel("Nom").fill(deckName);
  await page.getByRole("button", { name: "Yaratish" }).click();
  await page.getByText(deckName).click();
  await expect(page).toHaveURL(/\/decks\/.+/);

  // create card
  await page.getByRole("button", { name: "Yangi karta" }).click();
  await page.getByLabel("Old tomon").fill("Apple");
  await page.getByLabel("Orqa tomon").fill("Olma");
  await page.getByRole("button", { name: "Yaratish" }).click();
  await expect(page.getByText("Apple")).toBeVisible();

  // filter: new card is status "new"
  await expect(page.getByRole("button", { name: /Yangi \(1\)/ })).toBeVisible();

  // study: grade "easy" (rendered as a Link, so role is "link" not "button")
  await page.getByRole("link", { name: "O'rganish" }).click();
  await expect(page).toHaveURL(/\/decks\/.+\/study/);
  await page.getByRole("button", { name: "Javobni ko'rish" }).click();
  await page.getByRole("button", { name: "Oson" }).click();
  await expect(page.getByText(/Sessiya tugadi/)).toBeVisible();

  // back to deck: status moved to "easy" (also a Link under the hood)
  await page.getByRole("link", { name: "Deck'ga qaytish" }).click();
  await expect(page).toHaveURL(/\/decks\/[^/]+$/);
  await expect(page.getByRole("button", { name: /Oson \(1\)/ })).toBeVisible();

  // analytics: streak visible (nav link lives on /decks header)
  await page.goto("/decks");
  await page.getByRole("link", { name: "Analitika" }).click();
  await expect(page).toHaveURL(/\/analytics/);
  await expect(page.getByText("Ketma-ket kunlar")).toBeVisible();
});
