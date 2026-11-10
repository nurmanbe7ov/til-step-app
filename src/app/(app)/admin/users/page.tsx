import { Suspense } from "react";
import { PageLoader } from "@/components/common/page-loader";
import { PlaceholderPage } from "@/components/common/placeholder-page";
import { Progress } from "@/components/ui/progress";
import { getAdminEmployees } from "@/lib/admin/get-admin";
import { pluralLessons } from "@/lib/format";

export const metadata = {
  title: "Сотрудники",
};

async function EmployeesContent() {
  const result = await getAdminEmployees();

  if (result.status === "mock") {
    return (
      <PlaceholderPage
        title="Сотрудники"
        description="Подключите Supabase, чтобы видеть зарегистрированных сотрудников."
      />
    );
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Сотрудники</h1>
        <p className="mt-2 text-muted-foreground">
          {result.employees.length === 0
            ? "Пока никто не зарегистрировался."
            : "Новые сотрудники сверху. Прогресс считается по пройденным урокам."}
        </p>
      </header>
      {result.employees.length === 0 ? null : (
        <ul className="flex flex-col gap-3">
          {result.employees.map((employee) => (
            <li
              key={employee.id}
              className="flex min-w-0 flex-col gap-3 rounded-3xl border border-border bg-card px-4 py-4"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-semibold">{employee.fullName}</span>
                    {employee.role === "admin" ? (
                      <span className="shrink-0 text-sm font-medium text-muted-foreground">
                        Админ
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {employee.email}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  {employee.progressPercent}%
                </p>
              </div>
              <Progress
                value={employee.progressPercent}
                label={`Прогресс ${employee.fullName}`}
              />
              <p className="text-sm text-muted-foreground">
                {employee.completedLessons} из {employee.totalLessons}{" "}
                {pluralLessons(employee.totalLessons)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense
      fallback={<PageLoader label="Открываем сотрудников." className="min-h-[50vh]" />}
    >
      <EmployeesContent />
    </Suspense>
  );
}
