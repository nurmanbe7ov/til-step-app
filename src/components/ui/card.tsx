import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-border bg-card shadow-[0_10px_30px_rgba(23,56,42,0.05)]",
        className,
      )}
      {...props}
    />
  );
}
