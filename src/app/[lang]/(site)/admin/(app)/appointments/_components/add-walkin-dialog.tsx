"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { createWalkinAction } from "@/app/actions/admin";
import { formatDurationMinutes, formatPriceCents } from "@/lib/utils";

type BarberOption = { id: string; name: string };
type ServiceOption = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
};

export function AddWalkinDialog({
  barbers,
  services,
}: {
  barbers: BarberOption[];
  services: ServiceOption[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleAction(formData: FormData) {
    if (formData.getAll("serviceIds").length === 0) {
      setError("Pick at least one service.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createWalkinAction(null, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null);
        setOpen(next);
      }}
    >
      <DialogTrigger
        render={
          <Button type="button" size="sm">
            <Plus className="h-4 w-4" /> Add walk-in
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add walk-in customer</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={handleAction} className="grid gap-3">
          <div>
            <Label htmlFor="walkin-barberId">Barber</Label>
            <select
              id="walkin-barberId"
              name="barberId"
              required
              defaultValue=""
              className="mt-1 block h-9 w-full rounded-md border bg-background px-2 text-sm"
            >
              <option value="" disabled>
                Choose a barber…
              </option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="block">Services</Label>
            <div className="mt-1 grid max-h-44 gap-1 overflow-y-auto rounded-md border bg-background p-2">
              {services.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <input
                      type="checkbox"
                      name="serviceIds"
                      value={s.id}
                      className="h-4 w-4"
                    />
                    <span className="truncate">{s.name}</span>
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {formatDurationMinutes(s.duration_minutes)} ·{" "}
                    {formatPriceCents(s.price_cents)}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Pick at least one. Walk-ins don&apos;t block the booking grid.
            </p>
          </div>
          <div>
            <Label htmlFor="walkin-customerName">Name</Label>
            <Input
              id="walkin-customerName"
              name="customerName"
              required
              maxLength={120}
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="walkin-customerPhone">
              Phone
              <span className="ml-1 text-muted-foreground">— optional</span>
            </Label>
            <Input
              id="walkin-customerPhone"
              name="customerPhone"
              type="tel"
              inputMode="tel"
              placeholder="(555) 123-4567"
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="walkin-notes">
              Notes
              <span className="ml-1 text-muted-foreground">— optional</span>
            </Label>
            <Textarea
              id="walkin-notes"
              name="notes"
              rows={2}
              maxLength={500}
            />
          </div>
          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add to queue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
