"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createTimeOffAction } from "@/app/actions/admin";
import type { Barber } from "@/lib/types";

export function TimeOffForm({
  barbers,
}: {
  barbers: Pick<Barber, "id" | "name">[];
}) {
  const [state, formAction, pending] = useActionState(
    createTimeOffAction,
    null,
  );

  // Convert local datetime-local input to ISO with offset
  // We submit the value as-is; Zod expects an ISO with offset. The browser
  // produces "YYYY-MM-DDTHH:mm". We append the local timezone offset on submit
  // via a hidden script-free approach: use a small client wrapper.

  return (
    <form
      action={(fd) => {
        // Append timezone offset to the local datetime
        for (const k of ["startsAt", "endsAt"] as const) {
          const raw = fd.get(k);
          if (typeof raw === "string" && raw.length > 0) {
            const d = new Date(raw);
            if (!Number.isNaN(d.getTime())) {
              fd.set(k, d.toISOString());
            }
          }
        }
        return formAction(fd);
      }}
      className="grid gap-3 sm:grid-cols-2"
    >
      <div>
        <Label htmlFor="barberId">Barber</Label>
        <select
          id="barberId"
          name="barberId"
          className="block h-9 w-full rounded-md border bg-background px-2 text-sm"
          defaultValue=""
        >
          <option value="">Whole shop</option>
          {barbers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="reason">Reason (optional)</Label>
        <Input id="reason" name="reason" placeholder="Holiday, sick day…" />
      </div>
      <div>
        <Label htmlFor="startsAt">Starts</Label>
        <Input id="startsAt" name="startsAt" type="datetime-local" required />
      </div>
      <div>
        <Label htmlFor="endsAt">Ends</Label>
        <Input id="endsAt" name="endsAt" type="datetime-local" required />
      </div>
      {state?.error && (
        <p className="sm:col-span-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Add time off"}
        </Button>
      </div>
    </form>
  );
}
