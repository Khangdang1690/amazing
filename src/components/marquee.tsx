import { cn } from "@/lib/utils";

type Props = {
  items: string[];
  className?: string;
};

export function Marquee({ items, className }: Props) {
  // Duplicate the track so the loop is seamless.
  const track = (
    <div className="marquee__track">
      {items.map((it, i) => (
        <span
          key={`${it}-${i}`}
          className="flex items-center gap-3 text-sm tracking-[0.18em]"
        >
          <span className="italic-display text-2xl leading-none text-copper">
            ✦
          </span>
          <span className="uppercase">{it}</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className={cn("marquee py-4", className)}>
      {track}
      <div className="marquee__track" aria-hidden>
        {items.map((it, i) => (
          <span
            key={`dup-${it}-${i}`}
            className="flex items-center gap-3 text-sm tracking-[0.18em]"
          >
            <span className="italic-display text-2xl leading-none text-copper">
              ✦
            </span>
            <span className="uppercase">{it}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
