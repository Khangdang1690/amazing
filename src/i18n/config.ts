export const LOCALES = ["vi", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "vi";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Build a locale-prefixed path, e.g. localePath("vi", "/services") -> "/vi/services". */
export function localePath(locale: Locale, path: string): string {
  if (path === "/" || path === "") return `/${locale}`;
  return path.startsWith("/") ? `/${locale}${path}` : `/${locale}/${path}`;
}

/** Strip the locale prefix from a pathname. /vi/services -> /services, / -> /. */
export function stripLocale(pathname: string): string {
  const m = pathname.match(/^\/(vi|en)(\/.*)?$/);
  if (!m) return pathname;
  return m[2] ?? "/";
}

/** Simple placeholder substitution: replaces {key} with values[key]. */
export function tt(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in values ? String(values[k]) : `{${k}}`,
  );
}
