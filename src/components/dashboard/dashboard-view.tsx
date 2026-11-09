"use client";

import { BookOpen, Check, ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { HomeScene } from "@/components/dashboard/home-scene";
import { useAppData } from "@/components/layout/app-data";
import { Badge, Progress } from "@/components/ui/progress";
import type { DashboardData, ModuleStatus } from "@/lib/dashboard/types";
import { firstName } from "@/lib/format";

const statusLabel: Record<ModuleStatus, string> = {
  completed: "Готово",
  current: "Сейчас",
  locked: "Закрыто",
};

const statusTone: Record<ModuleStatus, "done" | "current" | "locked"> = {
  completed: "done",
  current: "current",
  locked: "locked",
};

function ModuleIcon({ status }: { status: ModuleStatus }) {
  if (status === "completed") {
    return (
      <span className="flex size-11 items-center justify-center rounded-full bg-primary/15 text-[#1d6a34]">
        <Check className="size-5" aria-hidden />
      </span>
    );
  }

  if (status === "current") {
    return (
      <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-foreground">
        <BookOpen className="size-5" aria-hidden />
      </span>
    );
  }

  return (
    <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Lock className="size-5" aria-hidden />
    </span>
  );
}

export function DashboardScreen() {
  const { dashboard } = useAppData();
  return <DashboardView data={dashboard} />;
}

function useDrawnProgress(value: number): number {
  const [drawn, setDrawn] = useState(0);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (media.matches) {
      setDrawn(value);
      return;
    }

    const frame = requestAnimationFrame(() => {
      setDrawn(value);
    });

    return () => cancelAnimationFrame(frame);
  }, [value]);

  return drawn;
}

function DashboardView({ data }: { data: DashboardData }) {
  const name = firstName(data.fullName);
  const progress = useDrawnProgress(data.progressPercent);

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-8">
      {data.usingMock ? (
        <p className="rounded-2xl border border-accent/70 bg-accent/35 px-4 py-3 text-sm leading-6">
          Это демонстрационный кабинет. Добавьте ключи Supabase в{" "}
          <span className="font-medium">.env.local</span>, чтобы включить вход
          и сохранение прогресса.
        </p>
      ) : null}

      <header className="home-rise relative min-h-64 w-full max-w-full overflow-hidden rounded-[2rem] border border-border/80 bg-[#f7f4ec] shadow-[0_18px_50px_rgba(23,56,42,0.06)] sm:min-h-80">
        <HomeScene />
        <div
          className="home-sun pointer-events-none absolute right-5 top-5 size-14 sm:right-8 sm:top-7 sm:size-16"
          aria-hidden
        >
          <span className="absolute inset-0 rounded-full bg-[#f4c95d]/40 blur-md" />
          <span className="absolute left-1/2 top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f4c95d] sm:size-8" />
        </div>
        <div className="relative max-w-sm px-6 py-8 sm:px-8 sm:py-10">
          <p className="text-xs font-semibold tracking-[0.16em] text-primary">
            САЛАМАТСЫЗБЫ!
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight break-words sm:text-4xl">
            Привет, {name}!
          </h1>
          <p className="mt-3 text-muted-foreground">
            Продолжим изучать кыргызский?
          </p>
        </div>
      </header>

      <section
        className="home-rise rounded-3xl bg-secondary px-5 py-5 sm:px-6"
        style={{ animationDelay: "90ms" }}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">Твой прогресс</h2>
          <p className="text-3xl font-semibold tabular-nums text-primary">
            {data.progressPercent}%
          </p>
        </div>
        <div className="mt-4">
          <Progress value={progress} glow />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>Уровень {data.level}</span>
          <span className="tabular-nums">
            {data.xp} из {data.xpGoal} XP
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Изучено слов: {data.learnedWords}
        </p>
      </section>

      <section
        className="home-rise flex flex-col gap-3"
        style={{ animationDelay: "160ms" }}
      >
        <h2 className="text-lg font-semibold">Продолжить обучение</h2>
        {data.continueLesson ? (
          <Link
            href={`/lesson/${data.continueLesson.id}`}
            className="group flex min-w-0 items-center gap-4 rounded-3xl border border-border bg-card px-4 py-4 shadow-[0_10px_30px_rgba(23,56,42,0.05)] transition duration-300 hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_16px_40px_rgba(23,56,42,0.08)]"
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
            <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
          </Link>
        ) : (
          <div className="rounded-3xl border border-dashed border-border bg-card px-5 py-6 text-sm text-muted-foreground">
            Опубликованных уроков пока нет. Они появятся, когда администратор
            откроет курс.
          </div>
        )}
      </section>

      <section className="home-rise" style={{ animationDelay: "230ms" }}>
        <h2 className="text-lg font-semibold">Твой учебный путь</h2>
        {data.modules.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Учебные модули ещё не опубликованы.
          </p>
        ) : (
          <ol className="mt-4 flex flex-col gap-3">
            {data.modules.map((module) => {
              const body = (
                <>
                  <ModuleIcon status={module.status} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{module.title}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {module.lessonRange}
                      {module.detail ? ` · ${module.detail}` : ""}
                    </span>
                  </span>
                  <Badge tone={statusTone[module.status]}>
                    {statusLabel[module.status]}
                  </Badge>
                </>
              );

              return (
                <li key={module.id}>
                  {module.href ? (
                    <Link
                      href={module.href}
                      className="flex min-w-0 items-center gap-4 rounded-3xl border border-border bg-card px-4 py-4 transition-colors hover:border-primary"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="flex min-w-0 items-center gap-4 rounded-3xl border border-border bg-card px-4 py-4 opacity-70">
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
