import "server-only";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { isRecord, isUuid, readNumber, readString } from "@/lib/parse";
import { createClient } from "@/lib/supabase/server";

export type AdminLessonSummary = {
  id: string;
  title: string;
  orderIndex: number;
  exerciseCount: number;
  isPublished: boolean;
};

export type AdminCourse = {
  id: string;
  title: string;
  level: string;
  lessons: AdminLessonSummary[];
};

export type AdminExerciseItem = {
  id: string;
  orderIndex: number;
  typeLabel: string;
  summary: string;
};

export type AdminLesson = {
  id: string;
  title: string;
  courseTitle: string;
  exercises: AdminExerciseItem[];
};

export type AdminCatalog =
  | { status: "mock" }
  | { status: "ready"; courses: AdminCourse[] };

const typeLabels: Record<string, string> = {
  flashcard: "Карточка",
  multiple_choice: "Выбор перевода",
  sentence_builder: "Сборка предложения",
  translation: "Перевод",
  fill_blank: "Пропуск",
  listening: "Аудирование",
};

function exerciseSummary(
  type: string,
  prompt: string,
  payload: unknown,
): string {
  if (!isRecord(payload)) {
    return prompt || "Задание";
  }

  if (type === "flashcard") {
    const kyrgyzWord = readString(payload.kyrgyzWord);
    const russianTranslation = readString(payload.russianTranslation);

    if (kyrgyzWord && russianTranslation) {
      return `${kyrgyzWord} — ${russianTranslation}`;
    }
  }

  if (type === "multiple_choice") {
    return readString(payload.prompt) ?? prompt;
  }

  if (type === "sentence_builder") {
    return readString(payload.translation) ?? prompt;
  }

  return prompt || "Задание";
}

export async function getAdminCatalog(): Promise<AdminCatalog> {
  const session = await requireSession();

  if (session.mode === "mock") {
    return { status: "mock" };
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const [coursesResult, lessonsResult, exercisesResult] = await Promise.all([
    supabase
      .from("courses")
      .select("id, title, level, order_index")
      .order("order_index", { ascending: true }),
    supabase
      .from("lessons")
      .select("id, course_id, title, order_index, is_published")
      .order("order_index", { ascending: true }),
    supabase.from("exercises").select("lesson_id"),
  ]);

  if (coursesResult.error || lessonsResult.error || exercisesResult.error) {
    throw new Error("Не удалось загрузить уроки");
  }

  const counts = new Map<string, number>();

  for (const row of Array.isArray(exercisesResult.data) ? exercisesResult.data : []) {
    if (!isRecord(row)) {
      continue;
    }

    const lessonId = readString(row.lesson_id);

    if (lessonId) {
      counts.set(lessonId, (counts.get(lessonId) ?? 0) + 1);
    }
  }

  const lessonsByCourse = new Map<string, AdminLessonSummary[]>();

  for (const row of Array.isArray(lessonsResult.data) ? lessonsResult.data : []) {
    if (!isRecord(row)) {
      continue;
    }

    const id = readString(row.id);
    const courseId = readString(row.course_id);
    const title = readString(row.title);
    const orderIndex = readNumber(row.order_index);

    if (!id || !courseId || !title || orderIndex === null) {
      continue;
    }

    const lessons = lessonsByCourse.get(courseId) ?? [];
    lessons.push({
      id,
      title,
      orderIndex,
      exerciseCount: counts.get(id) ?? 0,
      isPublished: row.is_published === true,
    });
    lessonsByCourse.set(courseId, lessons);
  }

  const courses: AdminCourse[] = [];

  for (const row of Array.isArray(coursesResult.data) ? coursesResult.data : []) {
    if (!isRecord(row)) {
      continue;
    }

    const id = readString(row.id);
    const title = readString(row.title);
    const level = readString(row.level);

    if (!id || !title || !level) {
      continue;
    }

    courses.push({
      id,
      title,
      level,
      lessons: (lessonsByCourse.get(id) ?? []).sort(
        (left, right) => left.orderIndex - right.orderIndex,
      ),
    });
  }

  return { status: "ready", courses };
}

export async function getAdminLesson(
  lessonId: string,
): Promise<AdminLesson | null | "mock"> {
  const session = await requireSession();

  if (session.mode === "mock") {
    return "mock";
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  if (!isUuid(lessonId)) {
    return null;
  }

  const supabase = await createClient();
  const lessonResult = await supabase
    .from("lessons")
    .select("id, title, course_id")
    .eq("id", lessonId)
    .maybeSingle();

  if (lessonResult.error) {
    throw new Error("Не удалось открыть урок");
  }

  if (!isRecord(lessonResult.data)) {
    return null;
  }

  const title = readString(lessonResult.data.title);
  const courseId = readString(lessonResult.data.course_id);

  if (!title || !courseId) {
    return null;
  }

  const [courseResult, exercisesResult] = await Promise.all([
    supabase.from("courses").select("title").eq("id", courseId).maybeSingle(),
    supabase
      .from("exercises")
      .select("id, type, prompt, payload, order_index")
      .eq("lesson_id", lessonId)
      .order("order_index", { ascending: true }),
  ]);

  if (courseResult.error || exercisesResult.error) {
    throw new Error("Не удалось открыть урок");
  }

  const courseTitle = isRecord(courseResult.data)
    ? readString(courseResult.data.title) ?? "Курс"
    : "Курс";
  const exercises: AdminExerciseItem[] = [];

  for (const row of Array.isArray(exercisesResult.data) ? exercisesResult.data : []) {
    if (!isRecord(row)) {
      continue;
    }

    const id = readString(row.id);
    const type = readString(row.type);
    const orderIndex = readNumber(row.order_index);

    if (!id || !type || orderIndex === null) {
      continue;
    }

    exercises.push({
      id,
      orderIndex,
      typeLabel: typeLabels[type] ?? "Задание",
      summary: exerciseSummary(type, readString(row.prompt) ?? "", row.payload),
    });
  }

  return {
    id: lessonId,
    title,
    courseTitle,
    exercises,
  };
}
