"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LOCALES, type Locale } from "@/i18n/config";

type Props = {
  locale: Locale;
  labels: { vi: string; en: string };
  ariaLabel: string;
  className?: string;
};

export function LocaleSwitcher({ locale, labels, ariaLabel, className }: Props) {
  const pathname = usePathname();

  function pathFor(target: Locale): string {
    const stripped = pathname.replace(/^\/(vi|en)(?=\/|$)/, "");
    return `/${target}${stripped || ""}`;
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-px border border-border bg-background font-mono text-[11px] uppercase tracking-[0.18em]",
        className,
      )}
    >
      {LOCALES.map((l) => {
        const active = l === locale;
        const label = labels[l];
        if (active) {
          return (
            <span
              key={l}
              aria-current="true"
              className="bg-foreground px-2.5 py-1 text-background"
            >
              {label}
            </span>
          );
        }
        return (
          <Link
            key={l}
            href={pathFor(l)}
            onClick={() => {
              // 1 year, root path. The proxy reads this cookie next request
              // to honor the user's choice on unprefixed paths.
              document.cookie = `NEXT_LOCALE=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
            }}
            className="px-2.5 py-1 text-foreground/70 hover:text-foreground"
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
