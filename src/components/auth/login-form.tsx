"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn, signUp } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from "@/lib/validation/auth";

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-destructive">{message}</p>;
}

export function LoginForm({
  configured,
  initialError,
}: {
  configured: boolean;
  initialError?: string;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [success, setSuccess] = useState<string | null>(null);
  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const registerForm = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const loginError = loginForm.formState.errors.root?.message ?? initialError;
  const registerError = registerForm.formState.errors.root?.message;

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-[0_10px_30px_rgba(23,56,42,0.05)] sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        {mode === "login" ? "Вход" : "Новый аккаунт"}
      </h1>
      {configured ? null : (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Ключи Supabase ещё не добавлены. Кабинет можно посмотреть на демонстрационных данных.
        </p>
      )}

      {!configured ? (
        <Button asChild className="mt-6 w-full">
          <Link href="/dashboard">Открыть демонстрационный кабинет</Link>
        </Button>
      ) : null}

      {mode === "login" ? (
        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={loginForm.handleSubmit(async (values) => {
            setSuccess(null);
            const result = await signIn(values);
            if (result && "error" in result) {
              loginForm.setError("root", { message: result.error });
            }
          })}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              disabled={!configured}
              {...loginForm.register("email")}
            />
            <FieldError message={loginForm.formState.errors.email?.message} />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">Пароль</Label>
              <Link href="/forgot-password" className="text-sm text-primary">
                Забыли пароль?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              disabled={!configured}
              {...loginForm.register("password")}
            />
            <FieldError message={loginForm.formState.errors.password?.message} />
          </div>
          {loginError ? (
            <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {loginError}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={!configured || loginForm.formState.isSubmitting}
          >
            {loginForm.formState.isSubmitting ? "Входим..." : "Войти"}
          </Button>
        </form>
      ) : (
        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={registerForm.handleSubmit(async (values) => {
            setSuccess(null);
            const result = await signUp(values);
            if (result && "error" in result) {
              registerForm.setError("root", { message: result.error });
              return;
            }
            if (result && "success" in result) {
              setSuccess(result.success);
            }
          })}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="fullName">Имя</Label>
            <Input
              id="fullName"
              autoComplete="name"
              disabled={!configured}
              {...registerForm.register("fullName")}
            />
            <FieldError message={registerForm.formState.errors.fullName?.message} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="register-email">Email</Label>
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              disabled={!configured}
              {...registerForm.register("email")}
            />
            <FieldError message={registerForm.formState.errors.email?.message} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="register-password">Пароль</Label>
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              disabled={!configured}
              {...registerForm.register("password")}
            />
            <FieldError message={registerForm.formState.errors.password?.message} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">Повторите пароль</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              disabled={!configured}
              {...registerForm.register("confirmPassword")}
            />
            <FieldError
              message={registerForm.formState.errors.confirmPassword?.message}
            />
          </div>
          {registerError ? (
            <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {registerError}
            </p>
          ) : null}
          {success ? (
            <p className="rounded-2xl bg-primary/15 px-3 py-2 text-sm">{success}</p>
          ) : null}
          <Button
            type="submit"
            disabled={!configured || registerForm.formState.isSubmitting}
          >
            {registerForm.formState.isSubmitting ? "Создаём..." : "Создать аккаунт"}
          </Button>
        </form>
      )}

      <button
        type="button"
        className="mt-5 text-sm text-muted-foreground"
        onClick={() => {
          setSuccess(null);
          setMode((current) => (current === "login" ? "register" : "login"));
        }}
      >
        {mode === "login" ? "Нет аккаунта? Создать" : "Уже есть аккаунт? Войти"}
      </button>
    </div>
  );
}
