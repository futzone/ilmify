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
