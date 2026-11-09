import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { PageLoader } from "@/components/common/page-loader";
import { getAppSession } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata = {
  title: "Вход",
};

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getAppSession();

  if (session.mode === "live") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const initialError =
    readParam(params.error) === "auth"
      ? "Ссылка для входа недействительна. Запросите новую."
      : undefined;

  return (
    <LoginForm
      configured={isSupabaseConfigured()}
      initialError={initialError}
    />
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<PageLoader label="Открываем вход." className="h-80" />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}
