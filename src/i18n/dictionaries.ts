import "server-only";
import type { Locale } from "./config";
import en from "./dictionaries/en.json";
import vi from "./dictionaries/vi.json";

const dictionaries = { en, vi } as const;

export type Dictionary = typeof en;

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export { tt } from "./config";
