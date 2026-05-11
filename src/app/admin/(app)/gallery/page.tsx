import Image from "next/image";
import { Card } from "@/components/ui/card";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { publicPhotoUrl } from "@/lib/queries";
import type { GalleryPhoto } from "@/lib/types";
import { GalleryUploadForm } from "./gallery-upload-form";
import { DeletePhotoButton } from "./delete-photo-button";

export const metadata = { title: "Gallery — Admin" };

export default async function AdminGalleryPage() {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("gallery_photos")
    .select("*")
    .order("display_order");
  const photos: GalleryPhoto[] = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gallery</h1>
        <p className="text-sm text-muted-foreground">
          Upload your best work. JPG/PNG up to 5 MB.
        </p>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Upload a photo</h2>
        <GalleryUploadForm />
      </Card>

      {photos.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          No photos yet.
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {photos.map((p) => (
            <div
              key={p.id}
              className="group relative aspect-square overflow-hidden rounded-xl bg-muted"
            >
              <Image
                src={publicPhotoUrl(p.storage_path)}
                alt={p.caption ?? ""}
                fill
                className="object-cover"
                sizes="(min-width: 768px) 33vw, 50vw"
              />
              <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                <DeletePhotoButton
                  id={p.id}
                  storagePath={p.storage_path}
                />
              </div>
              {p.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-xs text-white">
                  {p.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
