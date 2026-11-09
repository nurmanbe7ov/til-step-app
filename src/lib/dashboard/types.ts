export type ModuleStatus = "completed" | "current" | "locked";

export type LearningModule = {
  id: string;
  title: string;
  lessonRange: string;
  detail: string;
  status: ModuleStatus;
  href: string | null;
};

export type ContinueLesson = {
  id: string;
  title: string;
  meta: string;
};

export type ProgressLesson = {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  status: ModuleStatus;
  href: string | null;
};

export type DashboardData = {
  fullName: string;
  level: string;
  progressPercent: number;
  xp: number;
  xpGoal: number;
  streak: number;
  learnedWords: number;
  continueLesson: ContinueLesson | null;
  modules: LearningModule[];
  lessons: ProgressLesson[];
  usingMock: boolean;
};
