"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn, formatPriceCents, formatDurationMinutes } from "@/lib/utils";
import type { Service } from "@/lib/types";
import type { Slot } from "@/lib/availability";
import { type Locale, localePath, tt } from "@/i18n/config";

type Day = { iso: string; label: string; isSelected: boolean };

type Messages = {
  service: string;
  date: string;
  shopLocalTime: string;
  time: string;
  openings: string;
  closedToday: string;
  noOpenings: string;
};

type Props = {
  locale: Locale;
  barberSlug: string;
  barberId: string;
  services: Service[];
  selectedServiceId: string;
  days: Day[];
  selectedDate: string;
  slots: Slot[];
  closed: boolean;
  messages: Messages;
};

export function BookingPicker({
  locale,
  barberSlug,
  services,
  selectedServiceId,
  days,
  slots,
  closed,
  messages,
}: Props) {
  const router = useRouter();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();

  function navigate(updates: Record<string, string>) {
    const params = new URLSearchParams(search.toString());
    for (const [k, v] of Object.entries(updates)) params.set(k, v);
    startTransition(() => {
      router.replace(
        `${localePath(locale, `/book/${barberSlug}`)}?${params.toString()}`,
        { scroll: false },
      );
    });
  }

  function pickSlot(startsAtISO: string) {
    const params = new URLSearchParams();
    params.set("service", selectedServiceId);
    params.set("startsAt", startsAtISO);
    router.push(
      `${localePath(locale, `/book/${barberSlug}/confirm`)}?${params.toString()}`,
    );
  }

  return (
    <div className="mt-12 space-y-14">
      {/* Service picker */}
      <section>
        <div className="flex items-baseline justify-between gap-4">
          <span className="eyebrow">{messages.service}</span>
        </div>
        <div className="mt-4 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => navigate({ service: s.id })}
              className={cn(
                "flex items-baseline justify-between gap-3 bg-background p-5 text-left transition-colors hover:bg-card",
                s.id === selectedServiceId &&
                  "bg-foreground text-background hover:bg-foreground",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="font-display text-xl">{s.name}</div>
                <div
                  className={cn(
                    "mt-1 font-mono text-[11px] uppercase tracking-[0.15em]",
                    s.id === selectedServiceId
                      ? "text-background/60"
                      : "text-muted-foreground",
                  )}
                >
                  {formatDurationMinutes(s.duration_minutes)}
                </div>
              </div>
              <span className="num text-xl">
                {formatPriceCents(s.price_cents)}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Date strip */}
      <section>
        <div className="flex items-baseline justify-between gap-4">
          <span className="eyebrow">{messages.date}</span>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {messages.shopLocalTime}
          </span>
        </div>
        <div className="-mx-2 mt-4 flex gap-px overflow-x-auto bg-border px-2 pb-1">
          {days.map((d) => (
            <button
              key={d.iso}
              type="button"
              onClick={() => navigate({ date: d.iso })}
              className={cn(
                "min-w-[7rem] shrink-0 bg-background px-4 py-4 text-left transition-colors hover:bg-card",
                d.isSelected && "bg-foreground text-background hover:bg-foreground",
              )}
            >
              <div className="font-display text-lg">{d.label.split(",")[0]}</div>
              <div
                className={cn(
                  "font-mono text-[11px] uppercase tracking-[0.15em]",
                  d.isSelected ? "text-background/60" : "text-muted-foreground",
                )}
              >
                {d.label.split(",")[1]?.trim() ?? ""}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Slot grid */}
      <section>
        <div className="flex items-baseline justify-between gap-4">
          <span className="eyebrow">{messages.time}</span>
          {!closed && slots.length > 0 && (
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {tt(messages.openings, { count: slots.length })}
            </span>
          )}
        </div>
        {closed ? (
          <div className="mt-4 border border-dashed border-border p-12 text-center text-muted-foreground">
            {messages.closedToday}
          </div>
        ) : slots.length === 0 ? (
          <div className="mt-4 border border-dashed border-border p-12 text-center text-muted-foreground">
            {messages.noOpenings}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-px bg-border sm:grid-cols-4 md:grid-cols-6">
            {slots.map((s) => (
              <button
                key={s.startsAt}
                type="button"
                disabled={pending}
                onClick={() => pickSlot(s.startsAt)}
                className="num bg-background px-3 py-4 text-base font-medium transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
