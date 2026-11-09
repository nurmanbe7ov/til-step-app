import type {
  FlashcardPayload,
  MultipleChoicePayload,
  SentenceBuilderPayload,
} from "@/types/exercise";

export type LessonExercise =
  | {
      id: string;
      type: "flashcard";
      prompt: string;
      payload: FlashcardPayload;
    }
  | {
      id: string;
      type: "multiple_choice";
      prompt: string;
      payload: MultipleChoicePayload;
    }
  | {
      id: string;
      type: "sentence_builder";
      prompt: string;
      payload: SentenceBuilderPayload;
    };

export type LessonPlayerData = {
  lessonId: string;
  title: string;
  xpReward: number;
  exercises: LessonExercise[];
  startIndex: number;
  correctCount: number;
  alreadyCompleted: boolean;
  streak: number;
};

export type AnswerOutcome = {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string | null;
  nextIndex: number;
  total: number;
  correctCount: number;
  completed: boolean;
  xpGained: number;
  streak: number;
};

export type LessonLoad =
  | { status: "missing" }
  | { status: "mock" }
  | { status: "empty"; title: string }
  | { status: "invalid"; title: string }
  | { status: "ready"; lesson: LessonPlayerData };

export type SubmitAnswerResult =
  | { ok: true; data: AnswerOutcome }
  | { ok: false; error: string };
