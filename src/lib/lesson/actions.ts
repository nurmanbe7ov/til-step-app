"use server";

import { updateTag } from "next/cache";
import type { AnswerOutcome, SubmitAnswerResult } from "@/lib/lesson/types";
import { isRecord, isUuid, readNumber, readString } from "@/lib/parse";
import { createClient } from "@/lib/supabase/server";

const answerLimit = 500;

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function mapRpcError(message: string): string {
  if (
    message.includes("submit_answer") ||
    message.includes("Could not find the function") ||
    message.includes("schema cache")
  ) {
    return "Сохранение ответов ещё не включено. Выполните в Supabase новый SQL-файл урока.";
  }

  if (
    message === "Урок недоступен" ||
    message === "Задание не найдено" ||
    message === "Войдите снова" ||
    message === "Это задание уже пройдено или ещё не открыто"
  ) {
    return message;
  }

  return "Не удалось сохранить ответ. Попробуйте ещё раз.";
}

function parseOutcome(value: unknown): AnswerOutcome | { error: string } | null {
  if (!isRecord(value)) {
    return null;
  }

  const error = readString(value.error);

  if (error) {
    return { error: mapRpcError(error) };
  }

  const isCorrect = readBoolean(value.isCorrect);
  const nextIndex = readNumber(value.nextIndex);
  const total = readNumber(value.total);
  const correctCount = readNumber(value.correctCount);
  const completed = readBoolean(value.completed);
  const xpGained = readNumber(value.xpGained);
  const streak = readNumber(value.streak);

  if (
    isCorrect === null ||
    nextIndex === null ||
    total === null ||
    correctCount === null ||
    completed === null ||
    xpGained === null ||
    streak === null
  ) {
    return null;
  }

  return {
    isCorrect,
    correctAnswer: readString(value.correctAnswer) ?? "",
    explanation: readString(value.explanation),
    nextIndex,
    total,
    correctCount,
    completed,
    xpGained,
    streak,
  };
}

export async function submitAnswer(
  exerciseId: string,
  answer: string,
): Promise<SubmitAnswerResult> {
  if (!isUuid(exerciseId) || answer.length > answerLimit) {
    return { ok: false, error: "Не удалось проверить ответ." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_answer", {
    p_exercise_id: exerciseId,
    p_answer: answer,
  });

  if (error) {
    return { ok: false, error: mapRpcError(error.message) };
  }

  const outcome = parseOutcome(data);

  if (!outcome) {
    return { ok: false, error: "Не удалось прочитать результат проверки." };
  }

  if ("error" in outcome) {
    return { ok: false, error: outcome.error };
  }

  if (outcome.completed && outcome.xpGained > 0) {
    updateTag("dashboard");
    updateTag("app-session");
  }

  return { ok: true, data: outcome };
}
