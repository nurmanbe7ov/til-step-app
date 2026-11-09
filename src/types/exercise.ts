export const exerciseTypes = [
  "flashcard",
  "multiple_choice",
  "sentence_builder",
  "translation",
  "fill_blank",
  "listening",
] as const;

export type ExerciseType = (typeof exerciseTypes)[number];

export type FlashcardPayload = {
  kyrgyzWord: string;
  russianTranslation: string;
  exampleKyrgyz: string;
  exampleRussian: string;
  imageUrl?: string;
  audioUrl?: string;
};

export type MultipleChoicePayload = {
  prompt: string;
  options: string[];
};

export type SentenceBuilderPayload = {
  translation: string;
  tokens: string[];
  distractors: string[];
};

export type TranslationPayload = {
  source: string;
  direction: "ru_to_ky" | "ky_to_ru";
};

export type FillBlankPayload = {
  sentence: string;
  translation: string;
  options: string[];
};

export type ListeningPayload = {
  audioUrl: string;
  options: string[];
};

export type ExercisePayloadMap = {
  flashcard: FlashcardPayload;
  multiple_choice: MultipleChoicePayload;
  sentence_builder: SentenceBuilderPayload;
  translation: TranslationPayload;
  fill_blank: FillBlankPayload;
  listening: ListeningPayload;
};

export type ExercisePayload<T extends ExerciseType = ExerciseType> = {
  type: T;
  data: ExercisePayloadMap[T];
};
