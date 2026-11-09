"use server";

import { updateTag } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { isRecord, readNumber, readString } from "@/lib/parse";
import { createClient } from "@/lib/supabase/server";
import {
  parseExerciseBatch,
  parseExerciseForm,
  type PreparedExercise,
} from "@/lib/validation/exercise";

export type CreateExerciseResult =
  | { ok: true; count: number }
  | { ok: false; error: string };

function writeError(error: { message: string; code?: string }): string {
  if (error.code === "23505") {
    return "Не удалось сохранить задания. Обновите страницу и попробуйте ещё раз.";
  }

  return "Не удалось сохранить задания.";
}

function wordKey(kyrgyzWord: string, russianTranslation: string): string {
  return `${kyrgyzWord.toLocaleLowerCase("ru")}\n${russianTranslation.toLocaleLowerCase("ru")}`;
}

async function requireAdmin(): Promise<CreateExerciseResult | null> {
  const session = await requireSession();

  if (session.mode !== "live" || session.user.role !== "admin") {
    return { ok: false, error: "Недостаточно прав" };
  }

  return null;
}

async function saveExercises(
  lessonId: string,
  exercises: PreparedExercise[],
): Promise<CreateExerciseResult> {
  const supabase = await createClient();
  const lessonResult = await supabase
    .from("lessons")
    .select("id")
    .eq("id", lessonId)
    .maybeSingle();

  if (lessonResult.error || !isRecord(lessonResult.data)) {
    return { ok: false, error: "Урок не найден" };
  }

  const vocabularyIds = new Map<string, string>();
  const words = exercises.flatMap((exercise) =>
    exercise.vocabulary ? [exercise.vocabulary] : [],
  );

  if (words.length > 0) {
    const existing = await supabase
      .from("vocabulary")
      .select("id, kyrgyz_word, russian_translation")
      .in(
        "kyrgyz_word",
        words.map((word) => word.kyrgyzWord),
      );

    if (existing.error) {
      return { ok: false, error: "Не удалось сохранить слова" };
    }

    for (const row of Array.isArray(existing.data) ? existing.data : []) {
      if (!isRecord(row)) {
        continue;
      }

      const id = readString(row.id);
      const kyrgyzWord = readString(row.kyrgyz_word);
      const russianTranslation = readString(row.russian_translation);

      if (id && kyrgyzWord && russianTranslation) {
        vocabularyIds.set(wordKey(kyrgyzWord, russianTranslation), id);
      }
    }

    const missing = words.filter(
      (word) =>
        !vocabularyIds.has(wordKey(word.kyrgyzWord, word.russianTranslation)),
    );
    const uniqueMissing = missing.filter(
      (word, index) =>
        missing.findIndex(
          (item) =>
            wordKey(item.kyrgyzWord, item.russianTranslation) ===
            wordKey(word.kyrgyzWord, word.russianTranslation),
        ) === index,
    );

    if (uniqueMissing.length > 0) {
      const insertedWords = await supabase
        .from("vocabulary")
        .insert(
          uniqueMissing.map((word) => ({
            kyrgyz_word: word.kyrgyzWord,
            russian_translation: word.russianTranslation,
            example_kyrgyz: word.exampleKyrgyz || null,
            example_russian: word.exampleRussian || null,
          })),
        )
        .select("id, kyrgyz_word, russian_translation");

      if (insertedWords.error) {
        return { ok: false, error: "Не удалось сохранить слова" };
      }

      for (const row of Array.isArray(insertedWords.data)
        ? insertedWords.data
        : []) {
        if (!isRecord(row)) {
          continue;
        }

        const id = readString(row.id);
        const kyrgyzWord = readString(row.kyrgyz_word);
        const russianTranslation = readString(row.russian_translation);

        if (id && kyrgyzWord && russianTranslation) {
          vocabularyIds.set(wordKey(kyrgyzWord, russianTranslation), id);
        }
      }
    }
  }

  const lastExercise = await supabase
    .from("exercises")
    .select("order_index")
    .eq("lesson_id", lessonId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastExercise.error) {
    return { ok: false, error: "Не удалось сохранить задания." };
  }

  const startOrder =
    (isRecord(lastExercise.data)
      ? readNumber(lastExercise.data.order_index) ?? 0
      : 0) + 1;

  const inserted = await supabase.from("exercises").insert(
    exercises.map((exercise, index) => ({
      lesson_id: lessonId,
      type: exercise.type,
      prompt: exercise.prompt,
      payload: exercise.payload,
      accepted_answers: exercise.acceptedAnswers,
      order_index: startOrder + index,
      vocabulary_id: exercise.vocabulary
        ? vocabularyIds.get(
            wordKey(
              exercise.vocabulary.kyrgyzWord,
              exercise.vocabulary.russianTranslation,
            ),
          ) ?? null
        : null,
    })),
  );

  if (inserted.error) {
    return { ok: false, error: writeError(inserted.error) };
  }

  updateTag("dashboard");
  return { ok: true, count: exercises.length };
}

export async function createExercise(
  formData: FormData,
): Promise<CreateExerciseResult> {
  const denied = await requireAdmin();

  if (denied) {
    return denied;
  }

  const parsed = parseExerciseForm(formData);

  if (!parsed.ok) {
    return parsed;
  }

  return saveExercises(parsed.data.lessonId, [parsed.data]);
}

export async function importLessonExercises(
  formData: FormData,
): Promise<CreateExerciseResult> {
  const denied = await requireAdmin();

  if (denied) {
    return denied;
  }

  const parsed = parseExerciseBatch(formData);

  if (!parsed.ok) {
    return parsed;
  }

  return saveExercises(parsed.lessonId, parsed.exercises);
}
