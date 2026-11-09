"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  updatePasswordSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type UpdatePasswordInput,
} from "@/lib/validation/auth";

type AuthActionResult = { error: string } | { success: string };

async function siteOrigin(): Promise<string> {
  const headerStore = await headers();
  const origin = headerStore.get("origin");

  if (origin) {
    return origin;
  }

  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";

  return host ? `${proto}://${host}` : "http://localhost:3000";
}

function signUpError(error: { message: string; code?: string }): string {
  if (
    error.code === "user_already_exists" ||
    /already registered/i.test(error.message)
  ) {
    return "Такой email уже зарегистрирован";
  }

  return "Не удалось создать аккаунт. Проверьте данные и попробуйте ещё раз";
}

export async function signIn(input: LoginInput): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    return { error: "Проверьте email и пароль" };
  }

  if (!isSupabaseConfigured()) {
    return { error: "Вход пока недоступен: добавьте ключи Supabase в .env.local" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Подтвердите email по ссылке из письма, затем войдите" };
    }

    return { error: "Неверный email или пароль" };
  }

  redirect("/dashboard");
}

export async function signUp(input: RegisterInput): Promise<AuthActionResult> {
  const parsed = registerSchema.safeParse(input);

  if (!parsed.success) {
    return { error: "Проверьте данные формы" };
  }

  if (!isSupabaseConfigured()) {
    return {
      error: "Регистрация пока недоступна: добавьте ключи Supabase в .env.local",
    };
  }

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: signUpError(error) };
  }

  if (data.session) {
    redirect("/dashboard");
  }

  return {
    success: `Письмо отправлено на ${parsed.data.email}. Откройте его и подтвердите адрес, затем войдите.`,
  };
}

export async function requestPasswordReset(
  input: ForgotPasswordInput,
): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);

  if (!parsed.success) {
    return { error: "Введите корректный email" };
  }

  if (!isSupabaseConfigured()) {
    return {
      error: "Восстановление пока недоступно: добавьте ключи Supabase в .env.local",
    };
  }

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/auth/update-password`,
  });

  if (error && error.code !== "user_not_found") {
    return { error: "Не удалось отправить письмо. Попробуйте позже." };
  }

  return {
    success:
      "Если аккаунт с таким email есть, мы отправили письмо для смены пароля.",
  };
}

export async function updatePassword(
  input: UpdatePasswordInput,
): Promise<AuthActionResult> {
  const parsed = updatePasswordSchema.safeParse(input);

  if (!parsed.success) {
    return { error: "Проверьте новый пароль" };
  }

  if (!isSupabaseConfigured()) {
    return { error: "Смена пароля пока недоступна" };
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return { error: "Ссылка устарела. Запросите письмо ещё раз." };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Не удалось сохранить пароль. Запросите новую ссылку." };
  }

  redirect("/dashboard");
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}
