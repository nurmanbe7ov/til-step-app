import { Suspense } from "react";
import { LessonEditor } from "@/components/admin/lesson-editor";
import { PageLoader } from "@/components/common/page-loader";
import { PlaceholderPage } from "@/components/common/placeholder-page";
import { getAdminLesson } from "@/lib/admin/get-admin";

export const metadata = {
  title: "Урок",
};

async function EditorContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = await getAdminLesson(id);

  if (lesson === "mock") {
    return (
      <PlaceholderPage
        title="Урок"
        description="Подключите Supabase, чтобы редактировать задания."
      />
    );
  }

  if (!lesson) {
    return <PlaceholderPage title="Урок" description="Урок не найден." />;
  }

  return <LessonEditor lesson={lesson} />;
}

export default function AdminLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<PageLoader label="Открываем урок." className="min-h-[50vh]" />}>
      <EditorContent params={params} />
    </Suspense>
  );
}
