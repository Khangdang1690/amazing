"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteServiceAction } from "@/app/actions/admin";

export function DeleteServiceButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (confirm(`Delete service "${name}"?`)) {
          startTransition(async () => {
            await deleteServiceAction(id);
          });
        }
      }}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
