"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteTimeOffAction } from "@/app/actions/admin";

export function DeleteTimeOffButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await deleteTimeOffAction(id);
        })
      }
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
