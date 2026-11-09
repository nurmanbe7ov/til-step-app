import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-semibold tracking-[0.14em] text-primary">404</p>
      <h1 className="text-2xl font-semibold">Страница не найдена</h1>
      <Link href="/dashboard" className="text-sm font-medium text-primary">
        На главную
      </Link>
    </main>
  );
}
