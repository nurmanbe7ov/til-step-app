import "server-only";

import { getDashboard } from "@/lib/dashboard/get-dashboard";
import type { DashboardData } from "@/lib/dashboard/types";
import {
  requireSession,
  type AppSession,
  type SessionUser,
} from "@/lib/auth/session";
import { isRecord, readString } from "@/lib/parse";
import { createClient } from "@/lib/supabase/server";
import { getVocabulary } from "@/lib/vocabulary/get-vocabulary";
import type { VocabularyData } from "@/lib/vocabulary/get-vocabulary";

export type AppWorkspace = {
  session: Extract<AppSession, { mode: "mock" | "live" }>;
  dashboard: DashboardData;
  vocabulary: VocabularyData;
};

async function readOnboardingCompleted(user: SessionUser, mode: "mock" | "live") {
  if (mode === "mock") {
    return true;
  }

  const supabase = await createClient();
  const result = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (result.error || !isRecord(result.data)) {
    return true;
  }

  return readString(result.data.onboarding_completed_at) !== null;
}

export async function loadWorkspace(): Promise<AppWorkspace> {
  const session = await requireSession();
  const [dashboard, vocabulary, onboardingCompleted] = await Promise.all([
    getDashboard(),
    getVocabulary(),
    readOnboardingCompleted(session.user, session.mode),
  ]);

  return {
    session: {
      ...session,
      user: {
        ...session.user,
        onboardingCompleted,
      },
    },
    dashboard,
    vocabulary,
  };
}
