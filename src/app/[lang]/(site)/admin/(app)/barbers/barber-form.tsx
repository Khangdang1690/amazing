"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { upsertBarberAction } from "@/app/actions/admin";
import type { Barber } from "@/lib/types";

export function BarberForm({
  initial,
  initialVi,
}: {
  initial?: Barber;
  initialVi?: { bio?: string };
}) {
  const [state, formAction, pending] = useActionState(
    upsertBarberAction,
    null,
  );

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      {initial?.id && (
        <input type="hidden" name="id" value={initial.id} />
      )}
      <div>
        <Label htmlFor={`name-${initial?.id ?? "new"}`}>Name</Label>
        <Input
          id={`name-${initial?.id ?? "new"}`}
          name="name"
          required
          defaultValue={initial?.name ?? ""}
        />
      </div>
      <div>
        <Label htmlFor={`slug-${initial?.id ?? "new"}`}>
          Slug (URL)
        </Label>
        <Input
          id={`slug-${initial?.id ?? "new"}`}
          name="slug"
          required
          pattern="[a-z0-9-]+"
          defaultValue={initial?.slug ?? ""}
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor={`bio-${initial?.id ?? "new"}`}>Bio (EN)</Label>
        <Textarea
          id={`bio-${initial?.id ?? "new"}`}
          name="bio"
          rows={2}
          defaultValue={initial?.bio ?? ""}
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor={`bio-vi-${initial?.id ?? "new"}`}>
          Tiểu sử (VN)
          <span className="ml-1 text-muted-foreground">— optional</span>
        </Label>
        <Textarea
          id={`bio-vi-${initial?.id ?? "new"}`}
          name="bio_vi"
          rows={2}
          defaultValue={initialVi?.bio ?? ""}
        />
      </div>
      <div>
        <Label htmlFor={`displayOrder-${initial?.id ?? "new"}`}>
          Display order
        </Label>
        <Input
          id={`displayOrder-${initial?.id ?? "new"}`}
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
          {pending ? "Saving…" : initial ? "Update" : "Add barber"}
        </Button>
      </div>
    </form>
  );
}
