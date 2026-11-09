import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/auth/session";
import { mockDashboard } from "@/lib/dashboard/mock";
import type {
  ContinueLesson,
  DashboardData,
  LearningModule,
  ModuleStatus,
  ProgressLesson,
} from "@/lib/dashboard/types";
import { pluralTasks, xpGoalFor } from "@/lib/format";
import { isRecord, readNumber, readString } from "@/lib/parse";
import { createClient } from "@/lib/supabase/server";

type CourseRecord = {
  id: string;
  title: string;
  level: string;
  orderIndex: number;
};

type LessonRecord = {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
};

type ProgressRecord = {
  lessonId: string;
  status: "in_progress" | "completed";
};

type FlatLesson = {
  lesson: LessonRecord;
  course: CourseRecord;
  globalIndex: number;
};

function isLevel(value: unknown): value is string {
  return value === "A0" || value === "A1" || value === "A2" || value === "B1";
}

function parseCourses(value: unknown): CourseRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const id = readString(item.id);
    const title = readString(item.title);
    const orderIndex = readNumber(item.order_index);

    if (!id || !title || orderIndex === null || !isLevel(item.level)) {
      return [];
    }

    return [{ id, title, level: item.level, orderIndex }];
  });
}

function parseLessons(value: unknown): LessonRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const id = readString(item.id);
    const courseId = readString(item.course_id);
    const title = readString(item.title);
    const orderIndex = readNumber(item.order_index);

    if (!id || !courseId || !title || orderIndex === null) {
      return [];
    }

    return [{ id, courseId, title, orderIndex }];
  });
}

function parseProgress(value: unknown): ProgressRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const lessonId = readString(item.lesson_id);
    const status = item.status;

    if (!lessonId || (status !== "in_progress" && status !== "completed")) {
      return [];
    }

    return [{ lessonId, status }];
  });
}

function countExercises(value: unknown): Map<string, number> {
  const counts = new Map<string, number>();

  if (!Array.isArray(value)) {
    return counts;
  }

  value.forEach((item) => {
    if (!isRecord(item)) {
      return;
    }

    const lessonId = readString(item.lesson_id);

    if (!lessonId) {
      return;
    }

    counts.set(lessonId, (counts.get(lessonId) ?? 0) + 1);
  });

  return counts;
}

function lessonMeta(exerciseCount: number): string {
  if (exerciseCount <= 0) {
    return "5–10 минут";
  }

  return `${exerciseCount} ${pluralTasks(exerciseCount)} · 5–10 минут`;
}

function buildModules(
  courses: CourseRecord[],
  flat: FlatLesson[],
  completed: Set<string>,
  inProgress: Set<string>,
): LearningModule[] {
  let lockRest = false;

  return courses.map((course) => {
    const lessons = flat.filter((item) => item.course.id === course.id);
    const allDone =
      lessons.length > 0 &&
      lessons.every((item) => completed.has(item.lesson.id));
    const started = lessons.some(
      (item) =>
        completed.has(item.lesson.id) || inProgress.has(item.lesson.id),
    );

    let status: ModuleStatus;

    if (lessons.length === 0 || lockRest) {
      status = "locked";
    } else if (allDone) {
      status = "completed";
    } else {
      status = "current";
      lockRest = true;
    }

    const first = lessons[0];
    const last = lessons[lessons.length - 1];
    const lessonRange =
      !first || !last
        ? "Пока нет уроков"
        : lessons.length === 1
          ? `Урок ${first.globalIndex}`
          : `Уроки ${first.globalIndex}–${last.globalIndex}`;

    const detail =
      status === "completed"
        ? "Завершено"
        : status === "current"
          ? started
            ? "В процессе"
            : "Можно начать"
          : "";

    const target =
      lessons.find((item) => inProgress.has(item.lesson.id)) ??
      lessons.find((item) => !completed.has(item.lesson.id)) ??
      first;

    return {
      id: course.id,
      title: course.title,
      lessonRange,
      detail,
      status,
      href:
        status === "locked" || !target ? null : `/lesson/${target.lesson.id}`,
    };
  });
}

async function loadLiveDashboard(user: {
  id: string;
  fullName: string;
  streak: number;
}): Promise<DashboardData> {
  const supabase = await createClient();
  const [coursesResult, lessonsResult, progressResult, statsResult] =
    await Promise.all([
      supabase
        .from("courses")
        .select("id, title, level, order_index")
        .eq("is_published", true)
        .order("order_index", { ascending: true }),
      supabase
        .from("lessons")
        .select("id, course_id, title, order_index")
        .eq("is_published", true)
        .order("order_index", { ascending: true }),
      supabase
        .from("user_progress")
        .select("lesson_id, status")
        .eq("user_id", user.id),
      supabase
        .from("user_stats")
        .select("total_xp, learned_words_count, current_streak")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  if (coursesResult.error || lessonsResult.error || progressResult.error) {
    throw new Error("Не удалось загрузить учебный путь");
  }

  const courses = parseCourses(coursesResult.data).sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );
  const lessons = parseLessons(lessonsResult.data);
  const progress = parseProgress(progressResult.data);
  const stats = isRecord(statsResult.data) ? statsResult.data : null;

  const flat: FlatLesson[] = [];
  let globalIndex = 1;

  courses.forEach((course) => {
    lessons
      .filter((lesson) => lesson.courseId === course.id)
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .forEach((lesson) => {
        flat.push({ lesson, course, globalIndex });
        globalIndex += 1;
      });
  });

  const completed = new Set(
    progress
      .filter((item) => item.status === "completed")
      .map((item) => item.lessonId),
  );
  const inProgress = new Set(
    progress
      .filter((item) => item.status === "in_progress")
      .map((item) => item.lessonId),
  );

  const lessonIds = flat.map((item) => item.lesson.id);
  let exerciseCounts = new Map<string, number>();

  if (lessonIds.length > 0) {
    const exercisesResult = await supabase
      .from("exercises")
      .select("lesson_id")
      .in("lesson_id", lessonIds);

    if (exercisesResult.error) {
      throw new Error("Не удалось загрузить задания");
    }

    exerciseCounts = countExercises(exercisesResult.data);
  }

  const modules = buildModules(courses, flat, completed, inProgress);
  const continueItem =
    flat.find((item) => inProgress.has(item.lesson.id)) ??
    flat.find((item) => !completed.has(item.lesson.id));

  const continueLesson: ContinueLesson | null = continueItem
    ? {
        id: continueItem.lesson.id,
        title: `Урок ${continueItem.globalIndex}. ${continueItem.lesson.title}`,
        meta: lessonMeta(exerciseCounts.get(continueItem.lesson.id) ?? 0),
      }
    : null;
  const lessonProgress: ProgressLesson[] = flat.map((item) => {
    const status: ModuleStatus = completed.has(item.lesson.id)
      ? "completed"
      : item.lesson.id === continueItem?.lesson.id
        ? "current"
        : "locked";

    return {
      id: item.lesson.id,
      courseId: item.course.id,
      courseTitle: item.course.title,
      title: `Урок ${item.globalIndex}. ${item.lesson.title}`,
      status,
      href: status === "locked" ? null : `/lesson/${item.lesson.id}`,
    };
  });

  const currentModule = modules.find((module) => module.status === "current");
  const level =
    courses.find((course) => course.id === currentModule?.id)?.level ??
    courses.at(-1)?.level ??
    "A0";
  const doneCount = flat.filter((item) => completed.has(item.lesson.id)).length;
  const xp = readNumber(stats?.total_xp) ?? 0;

  return {
    fullName: user.fullName,
    level,
    progressPercent:
      flat.length === 0 ? 0 : Math.round((doneCount / flat.length) * 100),
    xp,
    xpGoal: xpGoalFor(xp),
    streak: readNumber(stats?.current_streak) ?? user.streak,
    learnedWords: readNumber(stats?.learned_words_count) ?? 0,
    continueLesson,
    modules,
    lessons: lessonProgress,
    usingMock: false,
  };
}

export async function getDashboard(): Promise<DashboardData> {
  "use cache: private";
  cacheLife({ stale: 300 });
  cacheTag("dashboard");

  const session = await getAppSession();

  if (session.mode === "anon") {
    redirect("/login");
  }

  if (session.mode === "mock") {
    return mockDashboard;
  }

  return loadLiveDashboard(session.user);
}
