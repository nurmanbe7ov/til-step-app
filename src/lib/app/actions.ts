"use server";

import { updateTag } from "next/cache";
import { loadWorkspace, type AppWorkspace } from "@/lib/app/workspace";
import { createClient } from "@/lib/supabase/server";

type OnboardingResult = { ok: true } | { ok: false; error: string };

export async function reloadWorkspace(): Promise<AppWorkspace> {
  return loadWorkspace();
}

export async function completeOnboarding(): Promise<OnboardingResult> {
  const supabase = await createClient();
  const { data, error: authError } = await supabase.auth.getUser();

  if (authError || !data.user) {
    return { ok: false, error: "Войдите снова и повторите." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", data.user.id);

  if (error) {
    return { ok: false, error: "Не удалось сохранить. Попробуйте ещё раз." };
  }

  updateTag("app-session");
  return { ok: true };
}
