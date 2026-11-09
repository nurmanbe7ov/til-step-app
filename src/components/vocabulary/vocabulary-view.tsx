"use client";

import Link from "next/link";
import { useAppData } from "@/components/layout/app-data";
import { Badge } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { pluralWords } from "@/lib/format";
import type { VocabularyData } from "@/lib/vocabulary/get-vocabulary";

export function VocabularyScreen() {
  const { vocabulary } = useAppData();
  return <VocabularyView data={vocabulary} />;
}

function VocabularyView({ data }: { data: VocabularyData }) {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-6">
      {data.usingMock ? (
        <p className="rounded-2xl border border-accent/70 bg-accent/35 px-4 py-3 text-sm leading-6">
          Это демонстрационный словарь. Добавьте ключи Supabase в{" "}
          <span className="font-medium">.env.local</span>, чтобы видеть свои
          слова.
        </p>
      ) : null}

      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Словарь</h1>
        <p className="mt-2 text-muted-foreground">
          {data.words.length} {pluralWords(data.words.length)}
        </p>
      </header>

      {data.words.length === 0 ? (
        <Card className="px-5 py-6">
          <p className="text-sm leading-6 text-muted-foreground">
            Пока здесь пусто. Слова появятся после карточек в уроке.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex text-sm font-semibold text-primary"
          >
            Перейти к урокам
          </Link>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.words.map((word) => (
            <li key={word.id}>
              <Card className="px-5 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-2xl font-semibold tracking-tight">
                      {word.kyrgyzWord}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {word.russianTranslation}
                    </p>
                  </div>
                  <Badge tone={word.learned ? "done" : "current"}>
                    {word.learned ? "Выучено" : "В процессе"}
                  </Badge>
                </div>
                {word.exampleKyrgyz || word.exampleRussian ? (
                  <div className="mt-4 rounded-2xl bg-secondary px-4 py-3">
                    {word.exampleKyrgyz ? (
                      <p className="font-medium">{word.exampleKyrgyz}</p>
                    ) : null}
                    {word.exampleRussian ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {word.exampleRussian}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
