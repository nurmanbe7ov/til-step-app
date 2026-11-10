import { cn } from "@/lib/utils";

const trail = "M16 52C24 36 36 28 40 28C44 28 56 36 64 52";

export function PageLoader({
  label = "Загрузка.",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex w-full flex-col items-center justify-center py-16",
        className,
      )}
    >
      <div className="relative flex size-24 items-center justify-center">
        <span className="page-loader-halo absolute inset-3 rounded-full bg-primary/15" />
        <svg viewBox="0 0 80 80" className="relative size-20" aria-hidden>
          <path
            d={trail}
            fill="none"
            stroke="var(--track)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            className="page-loader-path"
            d={trail}
            fill="none"
            stroke="#65B957"
            strokeWidth="3"
            strokeLinecap="round"
            pathLength="1"
          />
          <circle cx="16" cy="52" r="2.5" fill="#65B957" opacity="0.35" />
          <circle cx="40" cy="28" r="2.5" fill="#65B957" opacity="0.35" />
          <circle cx="64" cy="52" r="2.5" fill="#65B957" opacity="0.35" />
          <g className="page-loader-dot">
            <animateMotion dur="1.8s" repeatCount="indefinite" path={trail} />
            <circle r="8" fill="#F4C95D" opacity="0.35" />
            <circle r="4.5" fill="#F4C95D" />
          </g>
          <circle className="page-loader-still" cx="40" cy="28" r="4.5" fill="#F4C95D" />
        </svg>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
