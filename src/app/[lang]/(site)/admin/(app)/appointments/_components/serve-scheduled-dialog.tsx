"use client";

import { useRef, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Label } from "@/components/ui/label";
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
import { serveScheduledAppointmentAction } from "@/app/actions/admin";
import { formatDurationMinutes, formatPriceCents } from "@/lib/utils";

type ServiceOption = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
};

export function ServeScheduledDialog({
  appointmentId,
  services,
}: {
  appointmentId: string;
  services: ServiceOption[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleAction(formData: FormData) {
    const ids = formData.getAll("serviceIds").filter((v): v is string => typeof v === "string");
    if (ids.length === 0) {
      setError("Pick at least one service.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await serveScheduledAppointmentAction(appointmentId, ids);
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
            <Check className="h-4 w-4" /> Serve
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record what was done</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={handleAction} className="grid gap-3">
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
              Submitting marks the appointment complete.
            </p>
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
              {pending ? "Saving…" : "Mark served"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
