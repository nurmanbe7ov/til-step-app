"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAppData } from "@/components/layout/app-data";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { pluralDays } from "@/lib/format";
import { submitAnswer } from "@/lib/lesson/actions";
import type {
  AnswerOutcome,
  LessonExercise,
  LessonPlayerData,
} from "@/lib/lesson/types";
import { cn } from "@/lib/utils";

type WordChip = {
  key: string;
  word: string;
};

function hashSeed(seed: string): number {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function shuffleWithSeed(words: string[], seed: string): string[] {
  const next = [...words];
  let state = hashSeed(seed) || 1;

  for (let index = next.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    const current = next[index];
    next[index] = next[swapIndex];
    next[swapIndex] = current;
  }

  return next;
}

type GradedExercise = Extract<
  LessonExercise,
  { type: "multiple_choice" | "sentence_builder" }
>;

type Miss = {
  exercise: GradedExercise;
  correctAnswer: string;
};

type MatchPair = {
  id: string;
  kyrgyz: string;
  russian: string;
};

function normalizeAnswer(value: string): string {
  return value
    .trim()
    .replace(/ё/gi, "е")
    .replace(/[.,!?;:«»"()]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function praiseCopy(count: number): { title: string; caption: string } {
  if (count === 5) {
    return { title: "Идеально", caption: "Пять подряд" };
  }

  if (count === 10) {
    return { title: "Отлично", caption: "Десять подряд" };
  }

  if (count === 15) {
    return { title: "Великолепно", caption: "Пятнадцать подряд" };
  }

  return { title: "Так держать", caption: `${count} подряд` };
}

function PraiseLine({ text, className }: { text: string; className: string }) {
  return (
    <span
      className={cn(
        "block font-praise font-semibold leading-none tracking-[-0.03em] text-[#17382A]",
        className,
      )}
    >
      {text}
    </span>
  );
}

function PraiseBurst({ count }: { count: number }) {
  const copy = praiseCopy(count);

  return (
    <div
      role="status"
      className="lesson-praise pointer-events-none fixed inset-x-0 top-[22%] z-40 flex justify-center px-8"
    >
      <div className="relative flex w-fit max-w-full flex-col items-center">
        <div className="relative text-center">
          <span className="absolute left-1/2 top-1/2 w-52 -translate-x-1/2 -translate-y-1/2">
            <span className="lesson-praise-glow block h-20 w-full rounded-full bg-[#ffe7a3]/75 blur-md" />
          </span>
          <PraiseLine
            text={copy.title}
            className="whitespace-nowrap text-[clamp(1.85rem,5.4vw,3rem)]"
          />
          <PraiseLine
            text={copy.caption}
            className="mt-2 whitespace-nowrap text-[clamp(1.05rem,3.2vw,1.65rem)] text-[#C4962C] dark:text-[#e6c56a]"
          />
        </div>
        <img
          src="/praise-bolt.png"
          alt=""
          className="lesson-praise-bolt relative mt-2 h-28 w-auto sm:h-32"
        />
      </div>
    </div>
  );
}

function collectPairs(exercises: LessonExercise[]): MatchPair[] {
  const seen = new Set<string>();
  const pairs: MatchPair[] = [];

  for (const exercise of exercises) {
    if (exercise.type !== "flashcard") {
      continue;
    }

    const kyrgyz = exercise.payload.kyrgyzWord.trim();
    const russian = exercise.payload.russianTranslation.trim();
    const key = `${kyrgyz}|${russian}`;

    if (!kyrgyz || !russian || seen.has(key)) {
      continue;
    }

    seen.add(key);
    pairs.push({ id: exercise.id, kyrgyz, russian });

    if (pairs.length === 5) {
      break;
    }
  }

  return pairs;
}

function sentenceBank(exercise: LessonExercise): WordChip[] {
  if (exercise.type !== "sentence_builder") {
    return [];
  }

  const words = shuffleWithSeed(
    [...exercise.payload.tokens, ...exercise.payload.distractors],
    exercise.id,
  );

  return words.map((word, index) => ({
    key: `${exercise.id}-${index}`,
    word,
  }));
}

export function LessonPlayer({ lesson }: { lesson: LessonPlayerData }) {
  const total = lesson.exercises.length;
  const initialDone =
    lesson.alreadyCompleted || lesson.startIndex >= total;
  const [index, setIndex] = useState(Math.min(lesson.startIndex, total - 1));
  const [phase, setPhase] = useState<
    "answer" | "feedback" | "match" | "review" | "done"
  >(initialDone ? "done" : "answer");
  const [picked, setPicked] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<AnswerOutcome | null>(null);
  const [summary, setSummary] = useState<AnswerOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [combo, setCombo] = useState(0);
  const [praise, setPraise] = useState<number | null>(null);
  const [misses, setMisses] = useState<Miss[]>([]);
  const { reload } = useAppData();
  const pairs = useMemo(
    () => collectPairs(lesson.exercises),
    [lesson.exercises],
  );

  const exercise = lesson.exercises[index];
  const bank = useMemo(
    () => (exercise ? sentenceBank(exercise) : []),
    [exercise],
  );
  const selectedWords = selectedKeys.flatMap((key) => {
    const chip = bank.find((item) => item.key === key);
    return chip ? [chip] : [];
  });

  useEffect(() => {
    setPicked(null);
    setSelectedKeys([]);
  }, [exercise?.id]);

  useEffect(() => {
    if (!summary) {
      return;
    }

    void reload();
  }, [summary, reload]);

  useEffect(() => {
    if (praise === null) {
      return;
    }

    const timer = window.setTimeout(() => setPraise(null), 2200);
    return () => window.clearTimeout(timer);
  }, [praise]);

  function continueAfterLesson(outcome: AnswerOutcome, review: Miss[]) {
    setSummary(outcome);

    if (pairs.length >= 2) {
      setPhase("match");
      return;
    }

    if (review.length > 0) {
      setPhase("review");
      return;
    }

    setPhase("done");
  }

  function recordAnswer(current: LessonExercise, outcome: AnswerOutcome): Miss[] {
    if (current.type === "flashcard") {
      return misses;
    }

    if (outcome.isCorrect) {
      const nextCombo = combo + 1;
      setCombo(nextCombo);

      if (nextCombo % 5 === 0) {
        setPraise(nextCombo);
      }

      return misses;
    }

    setCombo(0);
    const next = [
      ...misses,
      { exercise: current, correctAnswer: outcome.correctAnswer },
    ];
    setMisses(next);
    return next;
  }

  const answered =
    phase === "done" ? total : phase === "feedback" ? index + 1 : index;
  const progressValue = total === 0 ? 0 : Math.round((answered / total) * 100);

  async function check(answer: string) {
    if (!exercise || pending || phase !== "answer") {
      return;
    }

    setPending(true);
    setError(null);

    const result = await submitAnswer(exercise.id, answer);

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    const review = recordAnswer(exercise, result.data);

    if (exercise.type === "flashcard") {
      if (result.data.completed) {
        continueAfterLesson(result.data, review);
        return;
      }

      setIndex(result.data.nextIndex);
      return;
    }

    setFeedback(result.data);
    setPhase("feedback");
  }

  function goNext() {
    if (!feedback) {
      return;
    }

    if (feedback.completed) {
      continueAfterLesson(feedback, misses);
      return;
    }

    setIndex(feedback.nextIndex);
    setFeedback(null);
    setPhase("answer");
  }

  const burst = praise !== null ? <PraiseBurst count={praise} /> : null;

  if (phase === "done" || !exercise) {
    return (
      <>
        {burst}
        <ResultScreen
          title={lesson.title}
          correctCount={summary?.correctCount ?? lesson.correctCount}
          total={summary?.total ?? total}
          xpGained={summary?.xpGained ?? 0}
          streak={summary?.streak ?? lesson.streak}
        />
      </>
    );
  }

  if (phase === "match") {
    return (
      <>
        {burst}
        <MatchRound
          pairs={pairs}
          onDone={() => {
            if (misses.length > 0) {
              setPhase("review");
              return;
            }

            setPhase("done");
          }}
        />
      </>
    );
  }

  if (phase === "review") {
    return (
      <>
        {burst}
        <ReviewRound misses={misses} onDone={() => setPhase("done")} />
      </>
    );
  }

  const sentenceAnswer = selectedWords.map((chip) => chip.word).join(" ");
  const canCheck =
    exercise.type === "multiple_choice"
      ? Boolean(picked)
      : exercise.type === "sentence_builder"
        ? selectedWords.length > 0
        : true;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      {burst}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/dashboard"
          onClick={() => {
            void reload();
          }}
          className="text-sm font-medium text-muted-foreground"
        >
          На главную
        </Link>
        <p className="text-sm font-medium tabular-nums text-muted-foreground">
          {index + 1} / {total}
        </p>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{lesson.title}</h1>
        <div className="mt-4">
          <Progress value={progressValue} label="Прогресс урока" />
        </div>
      </div>

      <section className="relative rounded-3xl bg-card px-5 py-6 shadow-sm sm:px-6">
        {exercise.type === "flashcard" ? (
          <FlashcardView exercise={exercise} />
        ) : null}

        {exercise.type === "multiple_choice" ? (
          <ChoiceView
            exercise={exercise}
            picked={picked}
            feedback={phase === "feedback" ? feedback : null}
            onPick={setPicked}
          />
        ) : null}

        {exercise.type === "sentence_builder" ? (
          <SentenceView
            exercise={exercise}
            bank={bank}
            selected={selectedWords}
            onAdd={(key) =>
              setSelectedKeys((current) =>
                current.includes(key) ? current : [...current, key],
              )
            }
            onRemove={(key) =>
              setSelectedKeys((current) =>
                current.filter((item) => item !== key),
              )
            }
            locked={phase === "feedback"}
          />
        ) : null}

        {phase === "feedback" && feedback ? (
          <FeedbackBanner outcome={feedback} />
        ) : null}

        {error ? (
          <p className="mt-4 text-sm leading-6 text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6">
          {phase === "feedback" ? (
            <Button type="button" size="lg" className="w-full" onClick={goNext}>
              Дальше
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={pending || !canCheck}
              onClick={() => {
                if (exercise.type === "flashcard") {
                  void check("seen");
                  return;
                }

                if (exercise.type === "multiple_choice" && picked) {
                  void check(picked);
                  return;
                }

                if (exercise.type === "sentence_builder") {
                  void check(sentenceAnswer);
                }
              }}
            >
              {pending
                ? "Проверяем..."
                : exercise.type === "flashcard"
                  ? "Запомнил"
                  : "Проверить"}
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

function FlashcardView({
  exercise,
}: {
  exercise: Extract<LessonExercise, { type: "flashcard" }>;
}) {
  return (
    <div className="text-center">
      <p className="text-xs font-semibold tracking-[0.16em] text-primary">
        НОВОЕ СЛОВО
      </p>
      <p className="mt-4 text-4xl font-semibold tracking-tight">
        {exercise.payload.kyrgyzWord}
      </p>
      <p className="mt-3 text-lg text-muted-foreground">
        {exercise.payload.russianTranslation}
      </p>
      {exercise.payload.exampleKyrgyz ? (
        <div className="mt-6 rounded-2xl bg-secondary px-4 py-4 text-left">
          <p className="text-base font-medium">{exercise.payload.exampleKyrgyz}</p>
          {exercise.payload.exampleRussian ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {exercise.payload.exampleRussian}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ChoiceView({
  exercise,
  picked,
  feedback,
  onPick,
}: {
  exercise: Extract<LessonExercise, { type: "multiple_choice" }>;
  picked: string | null;
  feedback: AnswerOutcome | null;
  onPick: (option: string) => void;
}) {
  return (
    <div>
      <p className="text-lg font-medium leading-7">
        {exercise.prompt || exercise.payload.prompt}
      </p>
      <div className="mt-5 flex flex-col gap-3">
        {exercise.payload.options.map((option, optionIndex) => {
          const isPicked = picked === option;
          const isCorrect = feedback?.correctAnswer === option;
          const isWrongPick = Boolean(feedback) && isPicked && !isCorrect;

          return (
            <button
              key={`${option}-${optionIndex}`}
              type="button"
              disabled={Boolean(feedback)}
              onClick={() => onPick(option)}
              className={cn(
                "rounded-2xl border border-border bg-card px-4 py-3 text-left text-base font-medium transition duration-150 active:scale-[0.98]",
                !feedback && !isPicked && "hover:bg-muted",
                (isCorrect || (!feedback && isPicked)) && "border-primary bg-secondary",
                isWrongPick && "border-destructive bg-destructive/10",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SentenceView({
  exercise,
  bank,
  selected,
  onAdd,
  onRemove,
  locked,
}: {
  exercise: Extract<LessonExercise, { type: "sentence_builder" }>;
  bank: WordChip[];
  selected: WordChip[];
  onAdd: (key: string) => void;
  onRemove: (key: string) => void;
  locked: boolean;
}) {
  const used = new Set(selected.map((chip) => chip.key));

  return (
    <div>
      <p className="text-lg font-medium">{exercise.prompt}</p>
      <p className="mt-2 text-base text-muted-foreground">
        {exercise.payload.translation}
      </p>
      <div className="mt-5 flex min-h-16 flex-wrap gap-2 rounded-2xl border border-dashed border-border bg-background px-3 py-3">
        {selected.length === 0 ? (
          <span className="text-sm text-muted-foreground">Нажмите слова ниже</span>
        ) : (
          selected.map((chip) => (
            <button
              key={chip.key}
              type="button"
              disabled={locked}
              onClick={() => onRemove(chip.key)}
              className="rounded-full bg-secondary px-4 py-2 text-base font-medium transition duration-150 active:scale-[0.98]"
            >
              {chip.word}
            </button>
          ))
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {bank.map((chip) =>
          used.has(chip.key) ? null : (
            <button
              key={chip.key}
              type="button"
              disabled={locked}
              onClick={() => onAdd(chip.key)}
              className="rounded-full border border-border bg-card px-4 py-2 text-base font-medium transition duration-150 hover:bg-muted active:scale-[0.98]"
            >
              {chip.word}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

function FeedbackBanner({ outcome }: { outcome: AnswerOutcome }) {
  return (
    <div
      className={cn(
        "mt-5 rounded-2xl px-4 py-3",
        outcome.isCorrect ? "bg-secondary" : "bg-destructive/10",
      )}
      role="status"
    >
      <p className="flex items-center gap-2 font-semibold">
        {outcome.isCorrect ? (
          <Check className="size-4 text-[var(--good)]" aria-hidden />
        ) : (
          <X className="size-4 text-destructive" aria-hidden />
        )}
        {outcome.isCorrect ? "Верно" : "Неверно"}
      </p>
      {!outcome.isCorrect && outcome.correctAnswer ? (
        <p className="mt-2 text-sm leading-6">
          Правильный ответ: {outcome.correctAnswer}
        </p>
      ) : null}
      {outcome.explanation ? (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {outcome.explanation}
        </p>
      ) : null}
    </div>
  );
}

function MatchRound({
  pairs,
  onDone,
}: {
  pairs: MatchPair[];
  onDone: () => void;
}) {
  const left = useMemo(
    () =>
      shuffleWithSeed(
        pairs.map((pair) => pair.id),
        `${pairs[0]?.id ?? "left"}-left`,
      ).flatMap((id) => {
        const pair = pairs.find((item) => item.id === id);
        return pair ? [pair] : [];
      }),
    [pairs],
  );
  const right = useMemo(
    () =>
      shuffleWithSeed(
        pairs.map((pair) => pair.id),
        `${pairs[0]?.id ?? "right"}-right`,
      ).flatMap((id) => {
        const pair = pairs.find((item) => item.id === id);
        return pair ? [pair] : [];
      }),
    [pairs],
  );
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState(false);
  const finished = matched.length === pairs.length;

  function choose(side: "left" | "right", id: string) {
    if (matched.includes(id) || wrong) {
      return;
    }

    const nextLeft = side === "left" ? id : leftId;
    const nextRight = side === "right" ? id : rightId;

    if (side === "left") {
      setLeftId(id);
    } else {
      setRightId(id);
    }

    if (!nextLeft || !nextRight) {
      return;
    }

    if (nextLeft === nextRight) {
      setMatched((current) => [...current, nextLeft]);
      setLeftId(null);
      setRightId(null);
      return;
    }

    setWrong(true);
    window.setTimeout(() => {
      setWrong(false);
      setLeftId(null);
      setRightId(null);
    }, 450);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <Link href="/dashboard" className="text-sm font-medium text-muted-foreground">
        На главную
      </Link>
      <div>
        <p className="text-xs font-semibold tracking-[0.16em] text-primary">
          ПАРЫ
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Соедините слово и перевод
        </h1>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-3">
          {left.map((pair) => (
            <PairTile
              key={`left-${pair.id}`}
              label={pair.kyrgyz}
              selected={leftId === pair.id}
              matched={matched.includes(pair.id)}
              wrong={wrong && leftId === pair.id}
              onClick={() => choose("left", pair.id)}
            />
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {right.map((pair) => (
            <PairTile
              key={`right-${pair.id}`}
              label={pair.russian}
              selected={rightId === pair.id}
              matched={matched.includes(pair.id)}
              wrong={wrong && rightId === pair.id}
              onClick={() => choose("right", pair.id)}
            />
          ))}
        </div>
      </div>
      <Button type="button" size="lg" className="w-full" disabled={!finished} onClick={onDone}>
        Дальше
      </Button>
    </div>
  );
}

function PairTile({
  label,
  selected,
  matched,
  wrong,
  onClick,
}: {
  label: string;
  selected: boolean;
  matched: boolean;
  wrong: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={matched}
      onClick={onClick}
      className={cn(
        "min-h-16 rounded-2xl border border-border bg-card px-3 py-3 text-center text-base font-medium transition duration-150 active:scale-[0.98] disabled:active:scale-100",
        selected && !wrong && "border-primary bg-secondary",
        matched && "border-primary bg-secondary text-[var(--good)]",
        wrong && "border-destructive bg-destructive/10",
      )}
    >
      {label}
    </button>
  );
}

function ReviewRound({
  misses,
  onDone,
}: {
  misses: Miss[];
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [verdict, setVerdict] = useState<"correct" | "wrong" | null>(null);
  const item = misses[index];
  const exercise = item?.exercise;
  const bank = useMemo(
    () => (exercise ? sentenceBank(exercise) : []),
    [exercise],
  );
  const selectedWords = selectedKeys.flatMap((key) => {
    const chip = bank.find((entry) => entry.key === key);
    return chip ? [chip] : [];
  });

  if (!item || !exercise) {
    return null;
  }

  const sentenceAnswer = selectedWords.map((chip) => chip.word).join(" ");
  const canCheck =
    exercise.type === "multiple_choice" ? Boolean(picked) : selectedWords.length > 0;
  const outcome: AnswerOutcome | null =
    verdict === null
      ? null
      : {
          isCorrect: verdict === "correct",
          correctAnswer: item.correctAnswer,
          explanation: null,
          nextIndex: index,
          total: misses.length,
          correctCount: 0,
          completed: false,
          xpGained: 0,
          streak: 0,
        };

  function checkReview() {
    const value = exercise.type === "multiple_choice" ? (picked ?? "") : sentenceAnswer;
    setVerdict(
      normalizeAnswer(value) === normalizeAnswer(item.correctAnswer)
        ? "correct"
        : "wrong",
    );
  }

  function goReviewNext() {
    if (verdict !== "correct") {
      setVerdict(null);
      setPicked(null);
      setSelectedKeys([]);
      return;
    }

    if (index + 1 >= misses.length) {
      onDone();
      return;
    }

    setIndex((current) => current + 1);
    setVerdict(null);
    setPicked(null);
    setSelectedKeys([]);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <Link href="/dashboard" className="text-sm font-medium text-muted-foreground">
          На главную
        </Link>
        <p className="text-sm font-medium tabular-nums text-muted-foreground">
          {index + 1} / {misses.length}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold tracking-[0.16em] text-primary">
          ИСПРАВЛЯЕМ ОШИБКИ
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Ответьте ещё раз
        </h1>
      </div>
      <section className="rounded-3xl bg-card px-5 py-6 shadow-sm sm:px-6">
        {exercise.type === "multiple_choice" ? (
          <ChoiceView
            exercise={exercise}
            picked={picked}
            feedback={outcome}
            onPick={setPicked}
          />
        ) : (
          <SentenceView
            exercise={exercise}
            bank={bank}
            selected={selectedWords}
            onAdd={(key) =>
              setSelectedKeys((current) =>
                current.includes(key) ? current : [...current, key],
              )
            }
            onRemove={(key) =>
              setSelectedKeys((current) => current.filter((entry) => entry !== key))
            }
            locked={verdict !== null}
          />
        )}
        {outcome ? <FeedbackBanner outcome={outcome} /> : null}
        <div className="mt-6">
          {verdict === null ? (
            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={!canCheck}
              onClick={checkReview}
            >
              Проверить
            </Button>
          ) : (
            <Button type="button" size="lg" className="w-full" onClick={goReviewNext}>
              {verdict === "correct" ? "Дальше" : "Ещё раз"}
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

function ResultScreen({
  title,
  correctCount,
  total,
  xpGained,
  streak,
}: {
  title: string;
  correctCount: number;
  total: number;
  xpGained: number;
  streak: number;
}) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <section className="home-hero home-rise overflow-hidden rounded-[2rem] border border-border/80 px-5 py-8 text-center shadow-[0_18px_50px_rgba(23,56,42,0.06)] sm:px-8">
        <svg
          aria-hidden
          viewBox="0 0 360 78"
          className="mx-auto h-16 w-full max-w-sm"
        >
          <path
            id="lesson-finish-trail"
            className="lesson-finish-path"
            d="M24 52C90 50 140 30 180 36C230 44 280 24 336 30"
            fill="none"
            stroke="var(--home-ink)"
            strokeWidth="2"
            strokeLinecap="round"
            pathLength={1}
          />
          <circle className="home-walker-still" cx="336" cy="30" r="4" fill="#f4c95d" />
          <circle className="home-walker" r="4" fill="#f4c95d">
            <animateMotion dur="1.6s" fill="freeze">
              <mpath href="#lesson-finish-trail" />
            </animateMotion>
          </circle>
        </svg>
        <p className="mt-2 text-xs font-semibold tracking-[0.16em] text-primary">
          УРОК ЗАВЕРШЁН
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <div className="relative mx-auto mt-6 w-fit">
          <span
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            aria-hidden
          >
            <span className="lesson-finish-glow block size-28 rounded-full bg-[#f4c95d]/50 blur-2xl" />
          </span>
          <p className="relative text-5xl font-semibold tabular-nums tracking-tight">
            {correctCount}
          </p>
        </div>
        <p className="mt-2 text-muted-foreground">из {total} верно</p>
        <p className="mt-4 text-2xl font-semibold text-primary">
          {xpGained > 0 ? `+${xpGained} XP` : "Опыт за этот урок уже начислен"}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Серия: {streak} {pluralDays(streak)}
        </p>
        <Button asChild size="lg" className="mt-8 w-full">
          <Link href="/dashboard">На главную</Link>
        </Button>
      </section>
    </div>
  );
}
