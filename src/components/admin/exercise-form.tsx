"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createExercise, importLessonExercises } from "@/lib/admin/actions";

type ExerciseKind = "flashcard" | "multiple_choice" | "sentence_builder";

const kinds: { value: ExerciseKind; label: string }[] = [
  { value: "flashcard", label: "Карточка" },
  { value: "multiple_choice", label: "Выбор перевода" },
  { value: "sentence_builder", label: "Сборка предложения" },
];

export function BulkExerciseForm({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setSavedCount(null);
    setError(null);

    const result = await importLessonExercises(new FormData(form));
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    form.reset();
    setSavedCount(result.count);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="lessonId" value={lessonId} />
      <Field label="Слова" htmlFor="bulk-words">
        <Textarea
          id="bulk-words"
          name="wordsText"
          className="min-h-40"
          placeholder={"Салам | Привет | Салам, кандайсың? | Привет, как дела?\nРахмат | Спасибо"}
        />
      </Field>
      <p className="text-sm leading-6 text-muted-foreground">
        Каждая строка: слово | перевод. Примеры необязательны: слово | перевод
        | пример | перевод примера. Из списка соберутся карточки и вопросы.
      </p>
      <Field label="Предложения" htmlFor="bulk-sentences">
        <Textarea
          id="bulk-sentences"
          name="sentencesText"
          placeholder="Меня зовут Эрбол | Менин атым Эрбол | сен, рахмат"
        />
      </Field>
      <p className="text-sm leading-6 text-muted-foreground">
        Каждая строка: перевод | предложение на кыргызском | лишние слова.
        Лишние слова можно не указывать.
      </p>
      {error ? (
        <p className="text-sm leading-6 text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {savedCount !== null ? (
        <p className="text-sm leading-6 text-[#1d6a34]" role="status">
          Добавлено заданий: {savedCount}.
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Сохраняем..." : "Добавить список"}
      </Button>
    </form>
  );
}

export function ExerciseForm({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<ExerciseKind>("flashcard");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setSaved(false);
    setError(null);

    const result = await createExercise(new FormData(form));
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    form.reset();
    setKind("flashcard");
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="lessonId" value={lessonId} />
      <Field label="Тип задания" htmlFor="exercise-type">
        <select
          id="exercise-type"
          name="type"
          value={kind}
          onChange={(event) => {
            const value = event.target.value;
            if (
              value === "flashcard" ||
              value === "multiple_choice" ||
              value === "sentence_builder"
            ) {
              setKind(value);
            }
          }}
          className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          {kinds.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>

      {kind === "flashcard" ? (
        <>
          <Field label="Кыргызское слово" htmlFor="kyrgyz-word">
            <Input id="kyrgyz-word" name="kyrgyzWord" required maxLength={80} />
          </Field>
          <Field label="Перевод" htmlFor="russian-translation">
            <Input
              id="russian-translation"
              name="russianTranslation"
              required
              maxLength={160}
            />
          </Field>
          <Field label="Пример на кыргызском" htmlFor="example-kyrgyz">
            <Input id="example-kyrgyz" name="exampleKyrgyz" maxLength={200} />
          </Field>
          <Field label="Пример на русском" htmlFor="example-russian">
            <Input id="example-russian" name="exampleRussian" maxLength={200} />
          </Field>
        </>
      ) : null}

      {kind === "multiple_choice" ? (
        <>
          <Field label="Вопрос" htmlFor="choice-prompt">
            <Input id="choice-prompt" name="prompt" required maxLength={200} />
          </Field>
          <Field label="Варианты, каждый с новой строки" htmlFor="choice-options">
            <Textarea
              id="choice-options"
              name="optionsText"
              required
              placeholder={"Здравствуйте\nСпасибо\nДо свидания"}
            />
          </Field>
          <Field label="Правильный ответ" htmlFor="choice-correct">
            <Input id="choice-correct" name="correct" required maxLength={80} />
          </Field>
        </>
      ) : null}

      {kind === "sentence_builder" ? (
        <>
          <Field label="Перевод на русском" htmlFor="sentence-translation">
            <Input
              id="sentence-translation"
              name="translation"
              required
              maxLength={200}
            />
          </Field>
          <Field label="Предложение на кыргызском" htmlFor="sentence-words">
            <Input
              id="sentence-words"
              name="sentence"
              required
              maxLength={200}
              placeholder="Менин атым Эрбол"
            />
          </Field>
          <Field label="Лишние слова через запятую" htmlFor="sentence-distractors">
            <Input
              id="sentence-distractors"
              name="distractorsText"
              maxLength={200}
              placeholder="сен, рахмат"
            />
          </Field>
        </>
      ) : null}

      {error ? (
        <p className="text-sm leading-6 text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-sm leading-6 text-[#1d6a34]" role="status">
          Задание добавлено в конец урока.
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Сохраняем..." : "Добавить задание"}
      </Button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
