import { z } from "zod";
import { isUuid } from "@/lib/parse";
import type {
  FlashcardPayload,
  MultipleChoicePayload,
  SentenceBuilderPayload,
} from "@/types/exercise";

const flashcardSchema = z.object({
  kyrgyzWord: z
    .string()
    .trim()
    .min(1, "Введите кыргызское слово")
    .max(80, "Слишком длинное слово"),
  russianTranslation: z
    .string()
    .trim()
    .min(1, "Введите перевод")
    .max(160, "Слишком длинный перевод"),
  exampleKyrgyz: z.string().trim().max(200, "Слишком длинный пример"),
  exampleRussian: z.string().trim().max(200, "Слишком длинный пример"),
});

const choiceSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, "Введите вопрос")
    .max(200, "Слишком длинный вопрос"),
  optionsText: z.string().trim().min(1, "Введите варианты ответа"),
  correct: z
    .string()
    .trim()
    .min(1, "Введите правильный ответ")
    .max(80, "Слишком длинный ответ"),
});

const sentenceSchema = z.object({
  translation: z
    .string()
    .trim()
    .min(1, "Введите перевод")
    .max(200, "Слишком длинный перевод"),
  sentence: z
    .string()
    .trim()
    .min(1, "Введите предложение")
    .max(200, "Слишком длинное предложение"),
  distractorsText: z.string().trim().max(200, "Слишком много лишних слов"),
});

export type PreparedExercise = {
  lessonId: string;
  type: "flashcard" | "multiple_choice" | "sentence_builder";
  prompt: string;
  payload: FlashcardPayload | MultipleChoicePayload | SentenceBuilderPayload;
  acceptedAnswers: string[];
  vocabulary: {
    kyrgyzWord: string;
    russianTranslation: string;
    exampleKyrgyz: string;
    exampleRussian: string;
  } | null;
};

export type PreparedExerciseResult =
  | { ok: true; data: PreparedExercise }
  | { ok: false; error: string };

function formText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Проверьте поля";
}

function readLines(value: string, separator: RegExp): string[] {
  return value
    .split(separator)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function sameWord(left: string, right: string): boolean {
  return left.toLocaleLowerCase("ru") === right.toLocaleLowerCase("ru");
}

export function parseExerciseForm(formData: FormData): PreparedExerciseResult {
  const lessonId = formText(formData.get("lessonId"));
  const type = formText(formData.get("type"));

  if (!isUuid(lessonId)) {
    return { ok: false, error: "Урок не найден" };
  }

  if (type === "flashcard") {
    const parsed = flashcardSchema.safeParse({
      kyrgyzWord: formText(formData.get("kyrgyzWord")),
      russianTranslation: formText(formData.get("russianTranslation")),
      exampleKyrgyz: formText(formData.get("exampleKyrgyz")),
      exampleRussian: formText(formData.get("exampleRussian")),
    });

    if (!parsed.success) {
      return { ok: false, error: firstIssue(parsed.error) };
    }

    return {
      ok: true,
      data: {
        lessonId,
        type,
        prompt: "Новое слово",
        payload: parsed.data,
        acceptedAnswers: [],
        vocabulary: parsed.data,
      },
    };
  }

  if (type === "multiple_choice") {
    const parsed = choiceSchema.safeParse({
      prompt: formText(formData.get("prompt")),
      optionsText: formText(formData.get("optionsText")),
      correct: formText(formData.get("correct")),
    });

    if (!parsed.success) {
      return { ok: false, error: firstIssue(parsed.error) };
    }

    const options = readLines(parsed.data.optionsText, /\n+/);

    if (options.length < 2) {
      return { ok: false, error: "Нужно хотя бы два варианта" };
    }

    if (options.length > 6) {
      return { ok: false, error: "Можно добавить не больше шести вариантов" };
    }

    if (options.some((option) => option.length > 80)) {
      return { ok: false, error: "Слишком длинный вариант" };
    }

    const uniqueOptions = new Set(
      options.map((option) => option.toLocaleLowerCase("ru")),
    );

    if (uniqueOptions.size !== options.length) {
      return { ok: false, error: "Варианты не должны повторяться" };
    }

    if (!options.some((option) => option === parsed.data.correct)) {
      return {
        ok: false,
        error: "Правильный ответ должен совпадать с одним из вариантов",
      };
    }

    return {
      ok: true,
      data: {
        lessonId,
        type,
        prompt: parsed.data.prompt,
        payload: { prompt: parsed.data.prompt, options },
        acceptedAnswers: [parsed.data.correct],
        vocabulary: null,
      },
    };
  }

  if (type === "sentence_builder") {
    const parsed = sentenceSchema.safeParse({
      translation: formText(formData.get("translation")),
      sentence: formText(formData.get("sentence")),
      distractorsText: formText(formData.get("distractorsText")),
    });

    if (!parsed.success) {
      return { ok: false, error: firstIssue(parsed.error) };
    }

    const tokens = readLines(parsed.data.sentence, /\s+/);
    const distractors = readLines(parsed.data.distractorsText, /[,|\n]+/);

    if (tokens.length < 2) {
      return { ok: false, error: "В предложении нужно хотя бы два слова" };
    }

    if (tokens.length > 12) {
      return { ok: false, error: "В предложении слишком много слов" };
    }

    if (tokens.some((token) => token.length > 40)) {
      return { ok: false, error: "Слишком длинное слово в предложении" };
    }

    if (distractors.length > 6) {
      return { ok: false, error: "Можно добавить не больше шести лишних слов" };
    }

    if (distractors.some((word) => word.length > 40)) {
      return { ok: false, error: "Слишком длинное лишнее слово" };
    }

    if (
      distractors.some((word) =>
        tokens.some((token) => sameWord(token, word)),
      )
    ) {
      return {
        ok: false,
        error: "Лишнее слово не должно повторять слово из предложения",
      };
    }

    return {
      ok: true,
      data: {
        lessonId,
        type,
        prompt: "Соберите предложение",
        payload: {
          translation: parsed.data.translation,
          tokens,
          distractors,
        },
        acceptedAnswers: [tokens.join(" ")],
        vocabulary: null,
      },
    };
  }

  return { ok: false, error: "Выберите тип задания" };
}

const wordLimit = 40;
const sentenceLimit = 20;

type WordDraft = {
  kyrgyzWord: string;
  russianTranslation: string;
  exampleKyrgyz: string;
  exampleRussian: string;
};

function contentLines(value: string): { line: number; text: string }[] {
  return value.split(/\n/).flatMap((text, index) => {
    const trimmed = text.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return [];
    }

    return [{ line: index + 1, text: trimmed }];
  });
}

function splitColumns(value: string): string[] {
  return value.split("|").map((part) => part.trim());
}

function flashcardExercise(
  lessonId: string,
  word: WordDraft,
): PreparedExercise {
  return {
    lessonId,
    type: "flashcard",
    prompt: "Новое слово",
    payload: word,
    acceptedAnswers: [],
    vocabulary: word,
  };
}

function choiceOptions(correct: string, others: string[], seed: string): string[] {
  const options = others.slice(0, 3);
  let hash = 0;

  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  options.splice(hash % (options.length + 1), 0, correct);
  return options;
}

function parseWordLine(
  lessonId: string,
  line: number,
  text: string,
): { ok: true; word: WordDraft } | { ok: false; error: string } {
  const parts = splitColumns(text);

  if (parts.length !== 2 && parts.length !== 4) {
    return {
      ok: false,
      error: `Слова, строка ${line}: укажите «слово | перевод» или добавьте оба примера`,
    };
  }

  const parsed = flashcardSchema.safeParse({
    kyrgyzWord: parts[0] ?? "",
    russianTranslation: parts[1] ?? "",
    exampleKyrgyz: parts[2] ?? "",
    exampleRussian: parts[3] ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: `Слова, строка ${line}: ${firstIssue(parsed.error)}`,
    };
  }

  return { ok: true, word: parsed.data };
}

function parseSentenceLine(
  lessonId: string,
  line: number,
  text: string,
): PreparedExerciseResult {
  const parts = splitColumns(text);

  if (parts.length < 2 || parts.length > 3) {
    return {
      ok: false,
      error: `Предложения, строка ${line}: укажите «перевод | предложение | лишние слова»`,
    };
  }

  const parsed = sentenceSchema.safeParse({
    translation: parts[0] ?? "",
    sentence: parts[1] ?? "",
    distractorsText: parts[2] ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: `Предложения, строка ${line}: ${firstIssue(parsed.error)}`,
    };
  }

  const tokens = readLines(parsed.data.sentence, /\s+/);
  const distractors = readLines(parsed.data.distractorsText, /[,|\n]+/);

  if (tokens.length < 2) {
    return {
      ok: false,
      error: `Предложения, строка ${line}: в предложении нужно хотя бы два слова`,
    };
  }

  if (tokens.length > 12 || tokens.some((token) => token.length > 40)) {
    return {
      ok: false,
      error: `Предложения, строка ${line}: проверьте длину слов`,
    };
  }

  if (distractors.length > 6 || distractors.some((word) => word.length > 40)) {
    return {
      ok: false,
      error: `Предложения, строка ${line}: слишком много лишних слов`,
    };
  }

  if (
    distractors.some((word) => tokens.some((token) => sameWord(token, word)))
  ) {
    return {
      ok: false,
      error: `Предложения, строка ${line}: лишнее слово повторяет слово из предложения`,
    };
  }

  return {
    ok: true,
    data: {
      lessonId,
      type: "sentence_builder",
      prompt: "Соберите предложение",
      payload: {
        translation: parsed.data.translation,
        tokens,
        distractors,
      },
      acceptedAnswers: [tokens.join(" ")],
      vocabulary: null,
    },
  };
}

export function parseExerciseBatch(formData: FormData):
  | { ok: true; lessonId: string; exercises: PreparedExercise[] }
  | { ok: false; error: string } {
  const lessonId = formText(formData.get("lessonId"));

  if (!isUuid(lessonId)) {
    return { ok: false, error: "Урок не найден" };
  }

  const wordLines = contentLines(formText(formData.get("wordsText")));
  const sentenceLines = contentLines(formText(formData.get("sentencesText")));

  if (wordLines.length === 0 && sentenceLines.length === 0) {
    return { ok: false, error: "Вставьте хотя бы одну строку" };
  }

  if (wordLines.length > wordLimit) {
    return { ok: false, error: `За один раз можно добавить не больше ${wordLimit} слов` };
  }

  if (sentenceLines.length > sentenceLimit) {
    return {
      ok: false,
      error: `За один раз можно добавить не больше ${sentenceLimit} предложений`,
    };
  }

  const words: WordDraft[] = [];

  for (const line of wordLines) {
    const parsed = parseWordLine(lessonId, line.line, line.text);

    if (!parsed.ok) {
      return parsed;
    }

    if (
      words.some((word) => sameWord(word.kyrgyzWord, parsed.word.kyrgyzWord))
    ) {
      return {
        ok: false,
        error: `Слова, строка ${line.line}: такое слово уже есть в списке`,
      };
    }

    words.push(parsed.word);
  }

  const exercises: PreparedExercise[] = [];

  words.forEach((word) => {
    exercises.push(flashcardExercise(lessonId, word));

    const others = words
      .filter(
        (item) =>
          !sameWord(item.russianTranslation, word.russianTranslation),
      )
      .map((item) => item.russianTranslation);
    const uniqueOthers = others.filter(
      (translation, index) =>
        others.findIndex((item) => sameWord(item, translation)) === index,
    );

    if (uniqueOthers.length === 0) {
      return;
    }

    const prompt = `Как переводится «${word.kyrgyzWord}»?`;
    const options = choiceOptions(
      word.russianTranslation,
      uniqueOthers,
      word.kyrgyzWord,
    );

    exercises.push({
      lessonId,
      type: "multiple_choice",
      prompt,
      payload: { prompt, options },
      acceptedAnswers: [word.russianTranslation],
      vocabulary: null,
    });
  });

  for (const line of sentenceLines) {
    const parsed = parseSentenceLine(lessonId, line.line, line.text);

    if (!parsed.ok) {
      return parsed;
    }

    exercises.push(parsed.data);
  }

  return { ok: true, lessonId, exercises };
}
