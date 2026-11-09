import "server-only";

import { requireSession } from "@/lib/auth/session";
import type { LessonExercise, LessonLoad } from "@/lib/lesson/types";
import { isRecord, isUuid, readNumber, readString } from "@/lib/parse";
import { createClient } from "@/lib/supabase/server";
import type {
  FlashcardPayload,
  MultipleChoicePayload,
  SentenceBuilderPayload,
} from "@/types/exercise";

function readOptionalString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readStringList(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const items: string[] = [];

  for (const item of value) {
    const text = readString(item);

    if (!text) {
      return null;
    }

    items.push(text);
  }

  return items;
}

function readFlashcard(value: unknown): FlashcardPayload | null {
  if (!isRecord(value)) {
    return null;
  }

  const kyrgyzWord = readString(value.kyrgyzWord);
  const russianTranslation = readString(value.russianTranslation);

  if (!kyrgyzWord || !russianTranslation) {
    return null;
  }

  return {
    kyrgyzWord,
    russianTranslation,
    exampleKyrgyz: readOptionalString(value.exampleKyrgyz),
    exampleRussian: readOptionalString(value.exampleRussian),
  };
}

function readChoice(value: unknown): MultipleChoicePayload | null {
  if (!isRecord(value)) {
    return null;
  }

  const options = readStringList(value.options);

  if (!options || options.length < 2) {
    return null;
  }

  return {
    prompt: readOptionalString(value.prompt),
    options,
  };
}

function readSentence(value: unknown): SentenceBuilderPayload | null {
  if (!isRecord(value)) {
    return null;
  }

  const translation = readString(value.translation);
  const tokens = readStringList(value.tokens);
  const distractors = readStringList(value.distractors) ?? [];

  if (!translation || !tokens || tokens.length === 0) {
    return null;
  }

  return { translation, tokens, distractors };
}

function readExercise(value: unknown): LessonExercise | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const type = readString(value.type);
  const prompt = readOptionalString(value.prompt);

  if (!id || !type) {
    return null;
  }

  if (type === "flashcard") {
    const payload = readFlashcard(value.payload);
    return payload ? { id, type, prompt, payload } : null;
  }

  if (type === "multiple_choice") {
    const payload = readChoice(value.payload);
    return payload ? { id, type, prompt, payload } : null;
  }

  if (type === "sentence_builder") {
    const payload = readSentence(value.payload);
    return payload ? { id, type, prompt, payload } : null;
  }

  return null;
}

export async function getLesson(lessonId: string): Promise<LessonLoad> {
  const session = await requireSession();

  if (session.mode === "mock") {
    return { status: "mock" };
  }

  if (!isUuid(lessonId)) {
    return { status: "missing" };
  }

  const supabase = await createClient();
  const [lessonResult, exerciseResult, progressResult] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, title, xp_reward")
      .eq("id", lessonId)
      .maybeSingle(),
    supabase
      .from("exercises")
      .select("id, type, prompt, payload, order_index")
      .eq("lesson_id", lessonId)
      .order("order_index", { ascending: true }),
    supabase
      .from("user_progress")
      .select("status, current_exercise_index, score")
      .eq("user_id", session.user.id)
      .eq("lesson_id", lessonId)
      .maybeSingle(),
  ]);

  if (lessonResult.error || exerciseResult.error || progressResult.error) {
    throw new Error("Не удалось открыть урок");
  }

  if (!isRecord(lessonResult.data)) {
    return { status: "missing" };
  }

  const title = readString(lessonResult.data.title) ?? "Урок";
  const rows = Array.isArray(exerciseResult.data) ? exerciseResult.data : [];

  if (rows.length === 0) {
    return { status: "empty", title };
  }

  const exercises: LessonExercise[] = [];

  for (const row of rows) {
    const exercise = readExercise(row);

    if (!exercise) {
      return { status: "invalid", title };
    }

    exercises.push(exercise);
  }

  const progress = isRecord(progressResult.data) ? progressResult.data : null;
  const status = readString(progress?.status);
  const startIndex = Math.max(
    0,
    readNumber(progress?.current_exercise_index) ?? 0,
  );
  const correctCount = Math.max(0, readNumber(progress?.score) ?? 0);
  const alreadyCompleted =
    status === "completed" || startIndex >= exercises.length;

  return {
    status: "ready",
    lesson: {
      lessonId,
      title,
      xpReward: Math.max(0, readNumber(lessonResult.data.xp_reward) ?? 0),
      exercises,
      startIndex: Math.min(startIndex, exercises.length),
      correctCount: Math.min(correctCount, exercises.length),
      alreadyCompleted,
      streak: session.user.streak,
    },
  };
}
