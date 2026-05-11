"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createBookingAction } from "@/app/actions/booking";
import type { Locale } from "@/i18n/config";

type Messages = {
  yourName: string;
  namePlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  notesLabel: string;
  notesPlaceholder: string;
  booking: string;
  lockItIn: string;
  confirmationNote: string;
};

type Props = {
  barberId: string;
  serviceId: string;
  startsAt: string;
  locale: Locale;
  messages: Messages;
};

export function ConfirmForm({
  barberId,
  serviceId,
  startsAt,
  locale,
  messages,
}: Props) {
  const [state, formAction, pending] = useActionState(
    createBookingAction,
    null,
  );

  return (
    <form action={formAction} className="mt-10 space-y-6">
      <input type="hidden" name="barberId" value={barberId} />
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="startsAt" value={startsAt} />
      <input type="hidden" name="locale" value={locale} />

      <div>
        <Label htmlFor="customerName" className="eyebrow mb-2">
          {messages.yourName}
        </Label>
        <Input
          id="customerName"
          name="customerName"
          required
          autoComplete="name"
          placeholder={messages.namePlaceholder}
          className="h-12 border-border bg-background text-base"
        />
      </div>

      <div>
        <Label htmlFor="customerPhone" className="eyebrow mb-2">
          {messages.phoneLabel}
        </Label>
        <Input
          id="customerPhone"
          name="customerPhone"
          type="tel"
          inputMode="tel"
          required
          autoComplete="tel"
          placeholder={messages.phonePlaceholder}
          className="h-12 border-border bg-background text-base"
        />
      </div>

      <div>
        <Label htmlFor="notes" className="eyebrow mb-2">
          {messages.notesLabel}
        </Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder={messages.notesPlaceholder}
          className="border-border bg-background text-base"
        />
      </div>

      {state && !state.ok && (
        <p className="border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="group inline-flex w-full items-center justify-center gap-3 border border-foreground bg-foreground py-5 text-xs uppercase tracking-[0.25em] text-background transition-colors hover:bg-copper disabled:opacity-50"
      >
        {pending ? messages.booking : messages.lockItIn}
        <span aria-hidden className="transition-transform group-hover:translate-x-1">
          →
        </span>
      </button>

      <p className="text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {messages.confirmationNote}
      </p>
    </form>
  );
}
