"use client";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">Не удалось открыть страницу</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Проверьте соединение и попробуйте ещё раз.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
      >
        Повторить
      </button>
    </main>
  );
}
