import Link from "next/link";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/reveal";
import { getActiveBarbersLocalized } from "@/lib/queries";
import { isLocale, localePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).book.metaIndex };
}

export default async function BookIndexPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang).book;

  const barbers = await getActiveBarbersLocalized(lang);

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-16 md:px-10 md:py-24">
      <Reveal>
        <div className="flex items-baseline justify-between gap-4">
          <span className="eyebrow">{t.step1}</span>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {t.pickChair}
          </span>
        </div>
        <h1 className="mt-6 font-display text-[clamp(2.75rem,8vw,6.5rem)] leading-[0.9] tracking-[-0.02em]">
          {t.title1}
          <br />
          <span className="italic-display text-copper">{t.title2}</span>?
        </h1>
      </Reveal>

      <hr className="hairline mt-12" />

      {barbers.length === 0 ? (
        <Reveal>
          <p className="mt-16 max-w-md text-muted-foreground">{t.noBarbers}</p>
        </Reveal>
      ) : (
        <div className="mt-12 grid gap-px bg-border md:grid-cols-3">
          {barbers.map((b, i) => (
            <Reveal key={b.id} delay={i * 80}>
              <Link
                href={localePath(lang, `/book/${b.slug}`)}
                className="group flex h-full flex-col bg-background p-8 transition-colors hover:bg-card"
              >
                <div className="flex items-baseline justify-between">
                  <span className="num text-xs text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="eyebrow">{t.barber}</span>
                </div>
                <h2 className="mt-6 text-5xl md:text-6xl">{b.name}</h2>
                {b.bio && (
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {b.bio}
                  </p>
                )}
                <span className="editorial-link mt-auto pt-10 text-sm uppercase tracking-[0.18em] text-copper">
                  {t.continue}
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
