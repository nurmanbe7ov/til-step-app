"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppData } from "@/components/layout/app-data";
import { Button } from "@/components/ui/button";
import { completeOnboarding } from "@/lib/app/actions";
import { firstName } from "@/lib/format";
import { cn } from "@/lib/utils";

const steps = [
  {
    title: "Заниматься можно по несколько минут",
    body: "Урок короткий: слова и фразы для работы и быта. Его реально пройти между делами.",
  },
  {
    title: "Как проходит урок",
    body: "Сначала карточка со словом и переводом. Потом выбор ответа. В конце соберите фразу из слов. Если ошибётесь, покажем верный вариант.",
  },
  {
    title: "Уроки идут по порядку",
    body: "Сейчас открыт текущий урок. Следующий появится, когда этот будет пройден. Вернуться можно с главной или из раздела «Обучение».",
  },
  {
    title: "Словарь и серия дней",
    body: "Слова с карточек остаются в «Словаре». Огонёк вверху считает дни подряд: чтобы серия не сбросилась, достаточно одного урока в день.",
  },
];

export function OnboardingTour() {
  const router = useRouter();
  const { session, dashboard, markOnboardingDone } = useAppData();
  const [stepIndex, setStepIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const step = steps[stepIndex];
  const last = stepIndex === steps.length - 1;

  if (session.user.onboardingCompleted || !step) {
    return null;
  }
  const name = firstName(session.user.fullName);
  const startHref = dashboard.continueLesson
    ? `/lesson/${dashboard.continueLesson.id}`
    : "/learn";

  async function close(start: boolean) {
    if (pending) {
      return;
    }

    setPending(true);
    setError(null);
    const result = await completeOnboarding();

    if (!result.ok) {
      setPending(false);
      setError(result.error);
      return;
    }

    markOnboardingDone();

    if (start) {
      router.push(startHref);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#17382A]/45 p-4 sm:items-center">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="w-full max-w-md rounded-3xl bg-card px-5 py-5 shadow-[0_20px_60px_rgba(23,56,42,0.18)] sm:px-6 sm:py-6"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-hidden>
            {steps.map((item, index) => (
              <span
                key={item.title}
                className={cn(
                  "h-1.5 rounded-full",
                  index === stepIndex ? "w-6 bg-primary" : "w-1.5 bg-muted",
                )}
              />
            ))}
          </div>
          <button
            type="button"
            className="text-sm font-medium text-muted-foreground"
            disabled={pending}
            onClick={() => {
              void close(false);
            }}
          >
            Пропустить
          </button>
        </div>
        {stepIndex === 0 ? (
          <p className="mt-5 text-sm font-medium text-primary">Салам, {name}</p>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">
            {stepIndex + 1} из {steps.length}
          </p>
        )}
        <h2
          id="onboarding-title"
          className="mt-2 text-2xl font-semibold tracking-tight"
        >
          {step.title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.body}</p>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        <Button
          type="button"
          size="lg"
          className="mt-6 w-full"
          disabled={pending}
          onClick={() => {
            if (last) {
              void close(true);
              return;
            }

            setStepIndex((current) => current + 1);
          }}
        >
          {last ? "Начать уроки" : "Далее"}
        </Button>
      </section>
    </div>
  );
}
