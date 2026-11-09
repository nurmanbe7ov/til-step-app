import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { isRecord, readNumber, readString } from "@/lib/parse";

export type UserRole = "student" | "admin";

export type SessionUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  streak: number;
  onboardingCompleted: boolean;
};

export type AppSession =
  | { mode: "mock"; user: SessionUser }
  | { mode: "live"; user: SessionUser }
  | { mode: "anon" };

const mockUser: SessionUser = {
  id: "mock-user",
  fullName: "Алексей",
  email: "alexey@company.local",
  role: "student",
  streak: 5,
  onboardingCompleted: true,
};

function readRole(value: unknown): UserRole {
  return value === "admin" ? "admin" : "student";
}

function readMetaName(metadata: unknown): string | null {
  if (!isRecord(metadata)) {
    return null;
  }

  return readString(metadata.full_name);
}

export async function getAppSession(): Promise<AppSession> {
  "use cache: private";
  cacheLife({ stale: 300 });
  cacheTag("app-session");

  if (!isSupabaseConfigured()) {
    return { mode: "mock", user: mockUser };
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return { mode: "anon" };
  }

  const authUser = authData.user;
  const [profileResult, statsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("id", authUser.id)
      .maybeSingle(),
    supabase
      .from("user_stats")
      .select("current_streak")
      .eq("user_id", authUser.id)
      .maybeSingle(),
  ]);

  const profile = isRecord(profileResult.data) ? profileResult.data : null;
  const email = readString(profile?.email) ?? authUser.email ?? "";
  const fullName =
    readString(profile?.full_name) ??
    readMetaName(authUser.user_metadata) ??
    email.split("@")[0] ??
    "Сотрудник";
  const stats = isRecord(statsResult.data) ? statsResult.data : null;

  return {
    mode: "live",
    user: {
      id: authUser.id,
      fullName,
      email,
      role: readRole(profile?.role),
      streak: readNumber(stats?.current_streak) ?? 0,
      onboardingCompleted: false,
    },
  };
}

export async function requireSession(): Promise<
  Extract<AppSession, { mode: "mock" | "live" }>
> {
  const session = await getAppSession();

  if (session.mode === "anon") {
    redirect("/login");
  }

  return session;
}
