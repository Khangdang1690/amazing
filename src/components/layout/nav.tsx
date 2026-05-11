"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SHOP } from "@/lib/env";
import { formatPhone } from "@/lib/phone";
import { type Locale, localePath, tt } from "@/i18n/config";
import { LocaleSwitcher } from "./locale-switcher";

type NavMessages = {
  homeAriaLabel: string;
  tagline: string;
  services: string;
  gallery: string;
  visit: string;
  myBookings: string;
  book: string;
  bookOnline: string;
  openMenu: string;
  call: string;
  switcherAria: string;
  switcherVi: string;
  switcherEn: string;
};

type Props = {
  locale: Locale;
  messages: NavMessages;
};

export function Nav({ locale, messages }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = [
    { href: localePath(locale, "/services"), label: messages.services },
    { href: localePath(locale, "/gallery"), label: messages.gallery },
    { href: localePath(locale, "/contact"), label: messages.visit },
    { href: localePath(locale, "/my-bookings"), label: messages.myBookings },
  ];

  return (
    <header className="relative z-30 border-b border-border bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between px-6 md:px-10">
        <Link
          href={localePath(locale, "/")}
          className="flex items-baseline gap-2 leading-none"
          aria-label={tt(messages.homeAriaLabel, { shop: SHOP.name })}
        >
          <span className="font-display text-2xl italic">Amazing</span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground sm:inline">
            {messages.tagline}
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "editorial-link text-sm uppercase tracking-[0.18em] text-foreground/70 hover:text-foreground",
                pathname.startsWith(l.href) && "text-foreground",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <a
            href={`tel:${SHOP.phoneE164}`}
            className="font-mono text-xs uppercase tracking-[0.18em] text-foreground/70 hover:text-foreground"
          >
            {formatPhone(SHOP.phoneE164)}
          </a>
          <LocaleSwitcher
            locale={locale}
            ariaLabel={messages.switcherAria}
            labels={{ vi: messages.switcherVi, en: messages.switcherEn }}
          />
          <Link
            href={localePath(locale, "/book")}
            className="group relative inline-flex items-center gap-2 border border-foreground bg-foreground px-5 py-3 text-xs uppercase tracking-[0.2em] text-background transition-colors hover:bg-copper hover:text-background"
          >
            <span>{messages.book}</span>
            <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>

        <button
          aria-label={messages.openMenu}
          aria-expanded={open}
          className="-mr-2 p-2 md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="mx-auto max-w-6xl px-6 py-6">
            <div className="flex flex-col gap-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="border-b border-border/60 py-4 text-2xl font-display"
                >
                  {l.label}
                </Link>
              ))}
              <a
                href={`tel:${SHOP.phoneE164}`}
                onClick={() => setOpen(false)}
                className="border-b border-border/60 py-4 font-mono text-sm uppercase tracking-[0.18em] text-foreground/80"
              >
                {messages.call} {formatPhone(SHOP.phoneE164)}
              </a>
              <Link
                href={localePath(locale, "/book")}
                onClick={() => setOpen(false)}
                className="mt-4 inline-flex items-center justify-center gap-2 border border-foreground bg-foreground px-5 py-4 text-xs uppercase tracking-[0.2em] text-background"
              >
                {messages.bookOnline} <span aria-hidden>→</span>
              </Link>
              <div className="mt-4 flex justify-center">
                <LocaleSwitcher
                  locale={locale}
                  ariaLabel={messages.switcherAria}
                  labels={{ vi: messages.switcherVi, en: messages.switcherEn }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
