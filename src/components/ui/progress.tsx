import { cn } from "@/lib/utils";

type ProgressProps = {
  value: number;
  label?: string;
  glow?: boolean;
};

export function Progress({ value, label = "Прогресс", glow = false }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const lit = glow && clamped > 0;

  return (
    <div
      className="h-2.5 w-full rounded-full bg-[#d7e4d2]"
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "relative h-full overflow-hidden rounded-full bg-primary transition-[width] duration-700 ease-out",
          lit && "home-progress",
        )}
        style={{ width: `${clamped}%` }}
      >
        {lit ? <span className="home-progress-sheen" aria-hidden /> : null}
      </div>
    </div>
  );
}

export function Badge({
  className,
  tone,
  children,
}: {
  className?: string;
  tone: "done" | "current" | "locked";
  children: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "done" && "bg-primary/15 text-[#1d6a34]",
        tone === "current" && "bg-foreground text-background",
        tone === "locked" && "bg-muted text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
