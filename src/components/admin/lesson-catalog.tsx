import Link from "next/link";
import { pluralTasks } from "@/lib/format";
import type { AdminCourse } from "@/lib/admin/get-admin";

export function LessonCatalog({ courses }: { courses: AdminCourse[] }) {
  if (courses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Курсов пока нет.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {courses.map((course) => (
        <section key={course.id} className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-semibold">{course.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Уровень {course.level}
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {course.lessons.map((lesson) => (
              <li key={lesson.id}>
                <Link
                  href={`/admin/lessons/${lesson.id}`}
                  className="flex items-center justify-between gap-4 rounded-3xl border border-border bg-card px-4 py-4 transition-colors hover:border-primary"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold">
                      {lesson.orderIndex}. {lesson.title}
                    </span>
                    {lesson.isPublished ? null : (
                      <span className="mt-1 block text-sm text-muted-foreground">
                        Черновик
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {lesson.exerciseCount} {pluralTasks(lesson.exerciseCount)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
