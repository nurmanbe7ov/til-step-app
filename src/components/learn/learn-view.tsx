"use client";

import { BookOpen, Check, ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import { useAppData } from "@/components/layout/app-data";
import { Badge } from "@/components/ui/progress";
import type { DashboardData, ModuleStatus } from "@/lib/dashboard/types";

const statusLabel: Record<ModuleStatus, string> = {
  completed: "Пройден",
  current: "Текущий",
  locked: "Закрыт",
};

const statusTone: Record<ModuleStatus, "done" | "current" | "locked"> = {
  completed: "done",
  current: "current",
  locked: "locked",
};

function LessonIcon({ status }: { status: ModuleStatus }) {
  if (status === "completed") {
    return (
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[#1d6a34]">
        <Check className="size-5" aria-hidden />
      </span>
    );
  }

  if (status === "current") {
    return (
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
        <BookOpen className="size-5" aria-hidden />
      </span>
    );
  }

  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Lock className="size-5" aria-hidden />
    </span>
  );
}

export function LearnScreen() {
  const { dashboard } = useAppData();
  return <LearnView data={dashboard} />;
}

function LearnView({ data }: { data: DashboardData }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      {data.usingMock ? (
        <p className="rounded-2xl border border-accent/70 bg-accent/35 px-4 py-3 text-sm leading-6">
          Это демонстрационный путь. Добавьте ключи Supabase в{" "}
          <span className="font-medium">.env.local</span>, чтобы открыть свои
          уроки.
        </p>
      ) : null}

      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Обучение</h1>
        <p className="mt-2 text-muted-foreground">
          Курсы и уроки по порядку.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Продолжить</h2>
        {data.continueLesson ? (
          <Link
            href={`/lesson/${data.continueLesson.id}`}
            className="flex items-center gap-4 rounded-3xl border border-border bg-card px-4 py-4 shadow-[0_10px_30px_rgba(23,56,42,0.05)] transition-colors hover:border-primary"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-foreground">
              <BookOpen className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">
                {data.continueLesson.title}
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {data.continueLesson.meta}
              </span>
            </span>
            <ChevronRight
              className="size-5 shrink-0 text-muted-foreground"
              aria-hidden
            />
          </Link>
        ) : (
          <div className="rounded-3xl border border-dashed border-border bg-card px-5 py-6 text-sm text-muted-foreground">
            Опубликованных уроков пока нет.
          </div>
        )}
      </section>

      {data.modules.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Учебные модули ещё не опубликованы.
        </p>
      ) : (
        data.modules.map((module) => {
          const lessons = data.lessons.filter(
            (lesson) => lesson.courseId === module.id,
          );

          return (
            <section key={module.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{module.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {module.lessonRange}
                    {module.detail ? ` · ${module.detail}` : ""}
                  </p>
                </div>
                <Badge tone={statusTone[module.status]}>
                  {statusLabel[module.status]}
                </Badge>
              </div>
              <ol className="flex flex-col gap-3">
                {lessons.map((lesson) => {
                  const body = (
                    <>
                      <LessonIcon status={lesson.status} />
                      <span className="min-w-0 flex-1 font-semibold">
                        {lesson.title}
                      </span>
                      <Badge tone={statusTone[lesson.status]}>
                        {statusLabel[lesson.status]}
                      </Badge>
                    </>
                  );

                  return (
                    <li key={lesson.id}>
                      {lesson.href ? (
                        <Link
                          href={lesson.href}
                          className="flex items-center gap-4 rounded-3xl border border-border bg-card px-4 py-4 transition-colors hover:border-primary"
                        >
                          {body}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-4 rounded-3xl border border-border bg-card px-4 py-4 opacity-70">
                          {body}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })
      )}
    </div>
  );
}
