"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteGalleryPhotoAction } from "@/app/actions/admin";

export function DeletePhotoButton({
  id,
  storagePath,
}: {
  id: string;
  storagePath: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="destructive"
      size="icon-sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await deleteGalleryPhotoAction(id, storagePath);
        })
      }
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
