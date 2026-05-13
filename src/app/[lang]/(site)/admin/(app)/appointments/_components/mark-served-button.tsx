"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markWalkinServedAction } from "@/app/actions/admin";

export function MarkServedButton({ appointmentId }: { appointmentId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await markWalkinServedAction(appointmentId);
        })
      }
    >
      <Check className="h-4 w-4" /> {pending ? "Saving…" : "Mark served"}
    </Button>
  );
}
