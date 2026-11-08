import { LogoMark, Wordmark } from "@/components/logo";

// A few scattered stars behind the logo; some gently twinkle.
const STARS: [number, number, number][] = [
  [8, 22, 1.1], [18, 70, 0.8], [29, 34, 1], [41, 82, 0.7], [48, 16, 0.9], [57, 58, 1.2],
  [64, 26, 0.7], [71, 84, 1], [79, 14, 1.1], [88, 66, 0.8], [94, 30, 1], [36, 12, 0.7],
];

// The company banner on the Overview page. It stays "night" in both themes.
export function BrandBanner({ eyebrow, title, line }: { eyebrow: string; title: string; line: string }) {
  return (
    <section
      className="night rise relative overflow-hidden rounded-[1.5rem]"
      style={{
        background:
          "radial-gradient(34rem 20rem at 82% 42%, rgb(255 255 255 / 0.2), transparent 70%), linear-gradient(115deg, #050505 0%, #141416 60%, #2a2a2d 100%)",
      }}
    >
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        {STARS.map(([x, y, r], i) => (
          <circle
            key={i}
            cx={`${x}%`}
            cy={`${y}%`}
            r={r}
            fill="#F5F5F7"
            opacity={0.7}
            className={i % 3 === 0 ? "twinkle" : undefined}
            style={i % 3 === 0 ? { animationDelay: `${i * 0.4}s` } : undefined}
          />
        ))}
      </svg>

      <div className="relative flex items-center justify-between gap-6 px-6 py-5 sm:px-9 sm:py-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-accent-text">{eyebrow}</p>
          <h2 className="mt-1.5 truncate text-2xl font-semibold sm:text-[2rem]">{title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{line}</p>
        </div>
        <div className="hidden shrink-0 flex-col items-center gap-3 sm:flex">
          <LogoMark twinkle className="h-20 w-auto drop-shadow-[0_0_24px_rgb(255_255_255/0.3)]" />
          <Wordmark className="text-[0.82rem]" />
        </div>
        <LogoMark twinkle className="h-16 w-auto shrink-0 sm:hidden" />
      </div>
    </section>
  );
}
