import Link from "next/link";
import { BulkExerciseForm, ExerciseForm } from "@/components/admin/exercise-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AdminLesson } from "@/lib/admin/get-admin";

export function LessonEditor({ lesson }: { lesson: AdminLesson }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div>
        <Link
          href="/admin/lessons"
          className="text-sm font-medium text-muted-foreground"
        >
          К урокам
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {lesson.title}
        </h1>
        <p className="mt-2 text-muted-foreground">{lesson.courseTitle}</p>
      </div>

      <Button asChild variant="outline" className="w-fit">
        <Link href={`/lesson/${lesson.id}`}>Открыть урок</Link>
      </Button>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Задания</h2>
        {lesson.exercises.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            В этом уроке пока нет заданий.
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {lesson.exercises.map((exercise) => (
              <li key={exercise.id}>
                <Card className="px-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    {exercise.orderIndex}. {exercise.typeLabel}
                  </p>
                  <p className="mt-1 font-medium">{exercise.summary}</p>
                </Card>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">Список заданий</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Вставьте слова и предложения целиком. Если сотрудник уже завершил
            урок, новые задания увидят те, кто ещё его не закончил.
          </p>
        </div>
        <Card className="px-5 py-5">
          <BulkExerciseForm lessonId={lesson.id} />
        </Card>
      </section>

      <details className="rounded-3xl border border-border bg-card px-5 py-4">
        <summary className="cursor-pointer text-base font-semibold">
          Одно задание
        </summary>
        <div className="mt-4">
          <ExerciseForm lessonId={lesson.id} />
        </div>
      </details>
    </div>
  );
}
