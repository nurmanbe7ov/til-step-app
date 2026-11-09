import "server-only";

import { requireSession } from "@/lib/auth/session";
import { isRecord, readString } from "@/lib/parse";
import { createClient } from "@/lib/supabase/server";

export type VocabularyWord = {
  id: string;
  kyrgyzWord: string;
  russianTranslation: string;
  exampleKyrgyz: string;
  exampleRussian: string;
  learned: boolean;
};

export type VocabularyData = {
  words: VocabularyWord[];
  usingMock: boolean;
};

const mockVocabulary: VocabularyData = {
  usingMock: true,
  words: [
    {
      id: "mock-salam",
      kyrgyzWord: "Салам",
      russianTranslation: "Привет",
      exampleKyrgyz: "Салам, кандайсың?",
      exampleRussian: "Привет, как дела?",
      learned: true,
    },
    {
      id: "mock-rahmat",
      kyrgyzWord: "Рахмат",
      russianTranslation: "Спасибо",
      exampleKyrgyz: "Рахмат, жакшы.",
      exampleRussian: "Спасибо, хорошо.",
      learned: true,
    },
    {
      id: "mock-salamatsyzby",
      kyrgyzWord: "Саламатсызбы",
      russianTranslation: "Здравствуйте",
      exampleKyrgyz: "Саламатсызбы!",
      exampleRussian: "Здравствуйте!",
      learned: true,
    },
  ],
};

type WordLink = {
  wordId: string;
  learned: boolean;
  reviewedAt: string | null;
};

function readLink(value: unknown): WordLink | null {
  if (!isRecord(value)) {
    return null;
  }

  const wordId = readString(value.word_id);

  if (!wordId) {
    return null;
  }

  return {
    wordId,
    learned: value.learned === true,
    reviewedAt: readString(value.last_reviewed_at),
  };
}

function readWord(value: unknown): Omit<VocabularyWord, "learned"> | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const kyrgyzWord = readString(value.kyrgyz_word);
  const russianTranslation = readString(value.russian_translation);

  if (!id || !kyrgyzWord || !russianTranslation) {
    return null;
  }

  return {
    id,
    kyrgyzWord,
    russianTranslation,
    exampleKyrgyz: readString(value.example_kyrgyz) ?? "",
    exampleRussian: readString(value.example_russian) ?? "",
  };
}

export async function getVocabulary(): Promise<VocabularyData> {
  const session = await requireSession();

  if (session.mode === "mock") {
    return mockVocabulary;
  }

  const supabase = await createClient();
  const linksResult = await supabase
    .from("user_vocabulary")
    .select("word_id, learned, last_reviewed_at")
    .eq("user_id", session.user.id);

  if (linksResult.error) {
    throw new Error("Не удалось загрузить словарь");
  }

  const links = (Array.isArray(linksResult.data) ? linksResult.data : [])
    .map(readLink)
    .filter((link): link is WordLink => link !== null)
    .sort((left, right) => {
      if (left.reviewedAt === right.reviewedAt) {
        return left.wordId.localeCompare(right.wordId);
      }

      if (!left.reviewedAt) {
        return 1;
      }

      if (!right.reviewedAt) {
        return -1;
      }

      return left.reviewedAt < right.reviewedAt ? 1 : -1;
    });

  if (links.length === 0) {
    return { words: [], usingMock: false };
  }

  const wordsResult = await supabase
    .from("vocabulary")
    .select("id, kyrgyz_word, russian_translation, example_kyrgyz, example_russian")
    .in(
      "id",
      links.map((link) => link.wordId),
    );

  if (wordsResult.error) {
    throw new Error("Не удалось загрузить словарь");
  }

  const byId = new Map<string, Omit<VocabularyWord, "learned">>();

  for (const row of Array.isArray(wordsResult.data) ? wordsResult.data : []) {
    const word = readWord(row);

    if (word) {
      byId.set(word.id, word);
    }
  }

  const words: VocabularyWord[] = [];

  for (const link of links) {
    const word = byId.get(link.wordId);

    if (!word) {
      continue;
    }

    words.push({ ...word, learned: link.learned });
  }

  return { words, usingMock: false };
}
