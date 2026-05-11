"use client";

import { useTransition } from "react";
import { Check, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateAppointmentStatusAction } from "@/app/actions/admin";
import type { AppointmentStatus } from "@/lib/types";

export function AppointmentRowActions({
  appointmentId,
  currentStatus,
}: {
  appointmentId: string;
  currentStatus: AppointmentStatus;
}) {
  const [pending, startTransition] = useTransition();

  function set(status: AppointmentStatus) {
    startTransition(async () => {
      await updateAppointmentStatusAction(appointmentId, status);
    });
  }

  if (currentStatus !== "confirmed") return null;

  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => set("completed")}
        disabled={pending}
      >
        <Check className="h-4 w-4" /> Completed
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => set("no_show")}
        disabled={pending}
      >
        <AlertTriangle className="h-4 w-4" /> No-show
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={() => set("cancelled")}
        disabled={pending}
      >
        <X className="h-4 w-4" /> Cancel
      </Button>
    </div>
  );
}
