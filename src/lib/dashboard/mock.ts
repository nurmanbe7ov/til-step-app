import type {
  DashboardData,
  ModuleStatus,
  ProgressLesson,
} from "@/lib/dashboard/types";

const mockLessonGroups = [
  [
    "intro",
    "Знакомство",
    ["Приветствие", "Как тебя зовут", "Откуда ты", "Вежливые фразы", "Знакомство с коллегой"],
  ],
  [
    "family",
    "Моя семья",
    ["Члены семьи", "Моя семья", "Возраст и числа", "Где они живут", "Рассказ о семье"],
  ],
  [
    "workday",
    "Мой рабочий день",
    ["Профессии", "На работе", "Время", "Просьба подождать", "Предложить помощь"],
  ],
] as const;

function mockLessons(): ProgressLesson[] {
  const lessons: ProgressLesson[] = [];
  let index = 1;

  mockLessonGroups.forEach(([courseId, courseTitle, titles]) => {
    titles.forEach((title) => {
      const status: ModuleStatus =
        index < 6 ? "completed" : index === 6 ? "current" : "locked";

      lessons.push({
        id: `lesson-${index}`,
        courseId,
        courseTitle,
        title: `Урок ${index}. ${title}`,
        status,
        href: status === "locked" ? null : `/lesson/lesson-${index}`,
      });
      index += 1;
    });
  });

  return lessons;
}

export const mockDashboard: DashboardData = {
  fullName: "Алексей",
  level: "A1",
  progressPercent: 35,
  xp: 35,
  xpGoal: 100,
  streak: 5,
  learnedWords: 120,
  continueLesson: {
    id: "lesson-6",
    title: "Урок 6. Моя семья",
    meta: "8 заданий · 5–10 минут",
  },
  modules: [
    {
      id: "intro",
      title: "Знакомство",
      lessonRange: "Уроки 1–5",
      detail: "Завершено",
      status: "completed",
      href: "/lesson/lesson-1",
    },
    {
      id: "family",
      title: "Моя семья",
      lessonRange: "Уроки 6–10",
      detail: "В процессе",
      status: "current",
      href: "/lesson/lesson-6",
    },
    {
      id: "workday",
      title: "Мой рабочий день",
      lessonRange: "Уроки 11–15",
      detail: "",
      status: "locked",
      href: null,
    },
  ],
  lessons: mockLessons(),
  usingMock: true,
};
