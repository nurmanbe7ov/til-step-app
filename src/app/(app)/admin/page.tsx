import Link from "next/link";

export const metadata = {
  title: "Админ-панель",
};

export default function AdminPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Админ-панель</h1>
        <p className="mt-2 text-muted-foreground">
          Добавляйте задания в уже созданные уроки.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/admin/lessons"
          className="rounded-3xl border border-border bg-card px-5 py-5 transition-colors hover:border-primary"
        >
          <span className="block text-lg font-semibold">Уроки</span>
          <span className="mt-2 block text-sm leading-6 text-muted-foreground">
            Вставьте список слов, карточки и вопросы соберутся сами.
          </span>
        </Link>
        <Link
          href="/admin/users"
          className="rounded-3xl border border-border bg-card px-5 py-5 transition-colors hover:border-primary"
        >
          <span className="block text-lg font-semibold">Сотрудники</span>
          <span className="mt-2 block text-sm leading-6 text-muted-foreground">
            Имя, почта и прогресс каждого сотрудника.
          </span>
        </Link>
      </div>
    </div>
  );
}
