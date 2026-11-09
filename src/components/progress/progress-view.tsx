"use client";

import { BookOpen, Check, Lock } from "lucide-react";
import Link from "next/link";
import { useAppData } from "@/components/layout/app-data";
import { Badge, Progress } from "@/components/ui/progress";
import type { DashboardData, ModuleStatus } from "@/lib/dashboard/types";
import { pluralDays, pluralWords } from "@/lib/format";

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

function courseGroups(data: DashboardData) {
  const groups: {
    id: string;
    title: string;
    lessons: DashboardData["lessons"];
  }[] = [];

  data.lessons.forEach((lesson) => {
    const group = groups.find((item) => item.id === lesson.courseId);

    if (group) {
      group.lessons.push(lesson);
      return;
    }

    groups.push({
      id: lesson.courseId,
      title: lesson.courseTitle,
      lessons: [lesson],
    });
  });

  return groups;
}

export function ProgressScreen() {
  const { dashboard } = useAppData();
  return <ProgressView data={dashboard} />;
}

function ProgressView({ data }: { data: DashboardData }) {
  const completedCount = data.lessons.filter(
    (lesson) => lesson.status === "completed",
  ).length;
  const groups = courseGroups(data);

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-8">
      {data.usingMock ? (
        <p className="rounded-2xl border border-accent/70 bg-accent/35 px-4 py-3 text-sm leading-6">
          Это демонстрационный прогресс. Добавьте ключи Supabase в{" "}
          <span className="font-medium">.env.local</span>, чтобы видеть свои
          уроки.
        </p>
      ) : null}

      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Прогресс</h1>
        <p className="mt-2 text-muted-foreground">
          {completedCount} из {data.lessons.length} уроков
        </p>
      </header>

      <section className="rounded-3xl bg-secondary px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">Уровень {data.level}</h2>
          <p className="text-3xl font-semibold tabular-nums text-primary">
            {data.progressPercent}%
          </p>
        </div>
        <div className="mt-4">
          <Progress value={data.progressPercent} label="Общий прогресс" />
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-card px-3 py-3">
            <dt className="text-xs text-muted-foreground">Опыт</dt>
            <dd className="mt-1 font-semibold tabular-nums">
              {data.xp} из {data.xpGoal}
            </dd>
          </div>
          <div className="rounded-2xl bg-card px-3 py-3">
            <dt className="text-xs text-muted-foreground">Серия</dt>
            <dd className="mt-1 font-semibold">
              {data.streak} {pluralDays(data.streak)}
            </dd>
          </div>
          <div className="rounded-2xl bg-card px-3 py-3">
            <dt className="text-xs text-muted-foreground">Слова</dt>
            <dd className="mt-1 font-semibold">
              {data.learnedWords} {pluralWords(data.learnedWords)}
            </dd>
          </div>
          <div className="rounded-2xl bg-card px-3 py-3">
            <dt className="text-xs text-muted-foreground">Уроки</dt>
            <dd className="mt-1 font-semibold tabular-nums">
              {completedCount} из {data.lessons.length}
            </dd>
          </div>
        </dl>
      </section>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Учебные модули ещё не опубликованы.
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.id} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{group.title}</h2>
            <ol className="flex flex-col gap-3">
              {group.lessons.map((lesson) => {
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
        ))
      )}
    </div>
  );
}
