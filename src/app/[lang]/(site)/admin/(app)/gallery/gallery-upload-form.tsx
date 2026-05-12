"use client";

import { useActionState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { uploadGalleryPhotoAction } from "@/app/actions/admin";

export function GalleryUploadForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    async (
      prev: { error?: string } | null,
      fd: FormData,
    ) => {
      const result = await uploadGalleryPhotoAction(prev, fd);
      if (!result?.error) ref.current?.reset();
      return result;
    },
    null,
  );

  return (
    <form
      ref={ref}
      action={formAction}
      encType="multipart/form-data"
      className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
    >
      <div>
        <Label htmlFor="file">Photo</Label>
        <Input id="file" name="file" type="file" accept="image/*" required />
      </div>
      <div>
        <Label htmlFor="caption">Caption (EN, optional)</Label>
        <Input id="caption" name="caption" placeholder="Fresh fade" />
      </div>
      <div>
        <Label htmlFor="caption_vi">Chú thích (VN, optional)</Label>
        <Input
          id="caption_vi"
          name="caption_vi"
          placeholder="Fade mới"
        />
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Uploading…" : "Upload"}
        </Button>
      </div>
      {state?.error && (
        <p className="sm:col-span-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
