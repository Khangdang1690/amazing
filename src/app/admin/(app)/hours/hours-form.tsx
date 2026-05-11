"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateHoursAction } from "@/app/actions/admin";
import type { ShopHours } from "@/lib/types";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function HoursForm({ hours }: { hours: ShopHours[] }) {
  const [state, formAction, pending] = useActionState(
    updateHoursAction,
    null,
  );

  const byDay: Record<number, ShopHours | undefined> = {};
  for (const h of hours) byDay[h.day_of_week] = h;

  return (
    <form action={formAction} className="space-y-3">
      {Array.from({ length: 7 }, (_, dow) => {
        const h = byDay[dow];
        return (
          <div
            key={dow}
            className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_auto_auto_auto]"
          >
            <div className="font-medium">{DAY_NAMES[dow]}</div>
            <Input
              type="time"
              name={`open_${dow}`}
              defaultValue={h?.open_time?.slice(0, 5) ?? "09:00"}
              className="w-32"
            />
            <Input
              type="time"
              name={`close_${dow}`}
              defaultValue={h?.close_time?.slice(0, 5) ?? "19:00"}
              className="w-32"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={`closed_${dow}`}
                defaultChecked={h?.closed ?? false}
                className="h-4 w-4"
              />
              Closed
            </label>
          </div>
        );
      })}
      {state?.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save hours"}
      </Button>
    </form>
  );
}
