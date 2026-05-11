"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createBookingAction } from "@/app/actions/booking";

type Props = {
  barberId: string;
  serviceId: string;
  startsAt: string;
};

export function ConfirmForm({ barberId, serviceId, startsAt }: Props) {
  const [state, formAction, pending] = useActionState(
    createBookingAction,
    null,
  );

  return (
    <form action={formAction} className="mt-10 space-y-6">
      <input type="hidden" name="barberId" value={barberId} />
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="startsAt" value={startsAt} />

      <div>
        <Label htmlFor="customerName" className="eyebrow mb-2">
          a. Your name
        </Label>
        <Input
          id="customerName"
          name="customerName"
          required
          autoComplete="name"
          placeholder="Jane Smith"
          className="h-12 border-border bg-background text-base"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="customerPhone" className="eyebrow mb-2">
            b. Phone
          </Label>
          <Input
            id="customerPhone"
            name="customerPhone"
            type="tel"
            inputMode="tel"
            required
            autoComplete="tel"
            placeholder="(714) 555-1234"
            className="h-12 border-border bg-background text-base"
          />
        </div>
        <div>
          <Label htmlFor="customerEmail" className="eyebrow mb-2">
            c. Email
          </Label>
          <Input
            id="customerEmail"
            name="customerEmail"
            type="email"
            inputMode="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="h-12 border-border bg-background text-base"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes" className="eyebrow mb-2">
          Anything we should know? (optional)
        </Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Specific style, fade length, etc."
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
        {pending ? "Booking…" : "Lock it in"}
        <span aria-hidden className="transition-transform group-hover:translate-x-1">
          →
        </span>
      </button>

      <p className="text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        Confirmation goes to your email. No spam, ever.
      </p>
    </form>
  );
}
