import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { getActiveBarbers } from "@/lib/queries";

export const metadata = {
  title: "Book — choose a barber",
};

export default async function BookIndexPage() {
  const barbers = await getActiveBarbers();

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-16 md:px-10 md:py-24">
      <Reveal>
        <div className="flex items-baseline justify-between gap-4">
          <span className="eyebrow">{`Step 01 / 03`}</span>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Pick a chair
          </span>
        </div>
        <h1 className="mt-6 font-display text-[clamp(2.75rem,8vw,6.5rem)] leading-[0.9] tracking-[-0.02em]">
          Who&apos;s cutting
          <br />
          <span className="italic-display text-copper">today</span>?
        </h1>
      </Reveal>

      <hr className="hairline mt-12" />

      {barbers.length === 0 ? (
        <Reveal>
          <p className="mt-16 max-w-md text-muted-foreground">
            No barbers are taking appointments right now. Check back soon, or
            give us a call.
          </p>
        </Reveal>
      ) : (
        <div className="mt-12 grid gap-px bg-border md:grid-cols-3">
          {barbers.map((b, i) => (
            <Reveal key={b.id} delay={i * 80}>
              <Link
                href={`/book/${b.slug}`}
                className="group flex h-full flex-col bg-background p-8 transition-colors hover:bg-card"
              >
                <div className="flex items-baseline justify-between">
                  <span className="num text-xs text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="eyebrow">Barber</span>
                </div>
                <h2 className="mt-6 text-5xl md:text-6xl">{b.name}</h2>
                {b.bio && (
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {b.bio}
                  </p>
                )}
                <span className="editorial-link mt-auto pt-10 text-sm uppercase tracking-[0.18em] text-copper">
                  Continue →
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
