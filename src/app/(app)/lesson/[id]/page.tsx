import { Suspense } from "react";
import { PageLoader } from "@/components/common/page-loader";
import { PlaceholderPage } from "@/components/common/placeholder-page";
import { LessonPlayer } from "@/components/lesson/lesson-player";
import { getLesson } from "@/lib/lesson/get-lesson";

export const metadata = {
  title: "Урок",
};

async function LessonContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getLesson(id);

  if (result.status === "missing") {
    return <PlaceholderPage title="Урок" description="Урок не найден." />;
  }

  if (result.status === "mock") {
    return (
      <PlaceholderPage
        title="Урок"
        description="Подключите Supabase, чтобы открыть задания и сохранить прогресс."
      />
    );
  }

  if (result.status === "empty") {
    return (
      <PlaceholderPage
        title={result.title}
        description="В этом уроке пока нет заданий."
      />
    );
  }

  if (result.status === "invalid") {
    return (
      <PlaceholderPage
        title={result.title}
        description="Задания этого урока заполнены неверно."
      />
    );
  }

  return <LessonPlayer lesson={result.lesson} />;
}

export default function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<PageLoader label="Открываем урок." className="min-h-[50vh]" />}>
      <LessonContent params={params} />
    </Suspense>
  );
}
