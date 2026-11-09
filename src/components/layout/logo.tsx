import Link from "next/link";

export function Logo({ href }: { href?: string }) {
  const content = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-semibold text-primary-foreground">
        T
      </span>
      <span>
        <span className="block text-base font-semibold leading-none tracking-tight">
          TilStep
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">
          Кыргызча күн сайын
        </span>
      </span>
    </>
  );

  if (!href) {
    return <div className="flex items-center gap-3">{content}</div>;
  }

  return (
    <Link href={href} className="flex items-center gap-3" aria-label="TilStep, на главную">
      {content}
    </Link>
  );
}
