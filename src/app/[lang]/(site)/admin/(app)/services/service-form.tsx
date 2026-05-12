"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { upsertServiceAction } from "@/app/actions/admin";
import type { Service } from "@/lib/types";

export function ServiceForm({
  initial,
  initialVi,
}: {
  initial?: Service;
  initialVi?: { name?: string; description?: string };
}) {
  const [state, formAction, pending] = useActionState(
    upsertServiceAction,
    null,
  );

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      {initial?.id && (
        <input type="hidden" name="id" value={initial.id} />
      )}
      <div className="sm:col-span-2">
        <Label htmlFor={`name-${initial?.id ?? "new"}`}>Name (EN)</Label>
        <Input
          id={`name-${initial?.id ?? "new"}`}
          name="name"
          required
          defaultValue={initial?.name ?? ""}
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor={`name-vi-${initial?.id ?? "new"}`}>
          Tên (VN)
          <span className="ml-1 text-muted-foreground">— optional</span>
        </Label>
        <Input
          id={`name-vi-${initial?.id ?? "new"}`}
          name="name_vi"
          defaultValue={initialVi?.name ?? ""}
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor={`desc-${initial?.id ?? "new"}`}>
          Description (EN)
        </Label>
        <Textarea
          id={`desc-${initial?.id ?? "new"}`}
          name="description"
          rows={2}
          defaultValue={initial?.description ?? ""}
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor={`desc-vi-${initial?.id ?? "new"}`}>
          Mô tả (VN)
          <span className="ml-1 text-muted-foreground">— optional</span>
        </Label>
        <Textarea
          id={`desc-vi-${initial?.id ?? "new"}`}
          name="description_vi"
          rows={2}
          defaultValue={initialVi?.description ?? ""}
        />
      </div>
      <div>
        <Label htmlFor={`dur-${initial?.id ?? "new"}`}>
          Duration (minutes)
        </Label>
        <Input
          id={`dur-${initial?.id ?? "new"}`}
          name="durationMinutes"
          type="number"
          min={5}
          max={480}
          required
          defaultValue={initial?.duration_minutes ?? 30}
        />
      </div>
      <div>
        <Label htmlFor={`price-${initial?.id ?? "new"}`}>
          Price (cents) — e.g. 3500 = $35
        </Label>
        <Input
          id={`price-${initial?.id ?? "new"}`}
          name="priceCents"
          type="number"
          min={0}
          required
          defaultValue={initial?.price_cents ?? 3500}
        />
      </div>
      <div>
        <Label htmlFor={`order-${initial?.id ?? "new"}`}>
          Display order
        </Label>
        <Input
          id={`order-${initial?.id ?? "new"}`}
          name="displayOrder"
          type="number"
          min={0}
          defaultValue={initial?.display_order ?? 0}
        />
      </div>
      <div className="flex items-end gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={initial?.active ?? true}
            className="h-4 w-4"
          />
          Active
        </label>
      </div>
      {state?.error && (
        <p className="sm:col-span-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : initial ? "Update" : "Add service"}
        </Button>
      </div>
    </form>
  );
}
