export const locales = ["uz"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "uz";
