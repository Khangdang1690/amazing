import Image from "next/image";
import { notFound } from "next/navigation";
import { InstagramIcon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { SHOP } from "@/lib/env";
import { getGalleryPhotosLocalized, publicPhotoUrl } from "@/lib/queries";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).gallery.meta };
}

// Editorial layout: varying aspect ratios cycle through to break the grid.
const aspects = [
  "aspect-[3/4]",
  "aspect-square",
  "aspect-[4/5]",
  "aspect-[3/4]",
  "aspect-[2/3]",
  "aspect-square",
];

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang).gallery;

  const photos = await getGalleryPhotosLocalized(lang);

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-20 md:px-10 md:py-32">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-7">
          <span className="eyebrow">{t.eyebrow}</span>
          <h1 className="mt-6 font-display text-[clamp(3rem,10vw,9rem)] leading-[0.88] tracking-[-0.02em]">
            {t.title1}
            <br />
            <span className="italic-display text-copper">{t.title2}</span>.
          </h1>
        </div>
        <div className="col-span-12 flex flex-col justify-end md:col-span-5">
          <p className="max-w-md text-base text-foreground/85 md:text-lg">
            {t.blurb}
          </p>
          <a
            href={SHOP.instagram}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex w-fit items-center gap-2 border border-foreground px-6 py-3 text-xs uppercase tracking-[0.22em] hover:bg-foreground hover:text-background"
          >
            <InstagramIcon className="h-4 w-4" />
            @{SHOP.instagramHandle}
          </a>
        </div>
      </div>

      <hr className="hairline mt-16" />

      {photos.length === 0 ? (
        <Reveal>
          <div className="mt-16 flex flex-col items-center justify-center border border-dashed border-border py-24 text-center">
            <InstagramIcon className="h-16 w-16 text-muted-foreground" />
            <p className="mt-6 max-w-md text-muted-foreground">{t.empty}</p>
          </div>
        </Reveal>
      ) : (
        <div className="mt-12 columns-1 gap-5 sm:columns-2 lg:columns-3">
          {photos.map((p, i) => (
            <Reveal key={p.id} delay={(i % 6) * 40} className="mb-5 break-inside-avoid">
              <figure className="group relative overflow-hidden border border-border bg-muted">
                <div className={`relative w-full ${aspects[i % aspects.length]}`}>
                  <Image
                    src={publicPhotoUrl(p.storage_path)}
                    alt={p.caption ?? t.recentWorkAlt}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  />
                </div>
                {p.caption && (
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background to-transparent p-4 font-mono text-[11px] uppercase tracking-[0.18em]">
                    {p.caption}
                  </figcaption>
                )}
              </figure>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
