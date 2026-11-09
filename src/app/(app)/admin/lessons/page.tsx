import { Suspense } from "react";
import { LessonCatalog } from "@/components/admin/lesson-catalog";
import { PageLoader } from "@/components/common/page-loader";
import { PlaceholderPage } from "@/components/common/placeholder-page";
import { getAdminCatalog } from "@/lib/admin/get-admin";

export const metadata = {
  title: "Уроки",
};

async function LessonsContent() {
  const catalog = await getAdminCatalog();

  if (catalog.status === "mock") {
    return (
      <PlaceholderPage
        title="Уроки"
        description="Подключите Supabase, чтобы редактировать задания."
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Уроки</h1>
        <p className="mt-2 text-muted-foreground">
          Откройте урок и вставьте список слов.
        </p>
      </header>
      <LessonCatalog courses={catalog.courses} />
    </div>
  );
}

export default function AdminLessonsPage() {
  return (
    <Suspense fallback={<PageLoader label="Открываем уроки." className="min-h-[50vh]" />}>
      <LessonsContent />
    </Suspense>
  );
}
