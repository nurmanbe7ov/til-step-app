"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { requestPasswordReset } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validation/auth";

export function ForgotPasswordForm({ configured }: { configured: boolean }) {
  const [success, setSuccess] = useState<string | null>(null);
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-[0_10px_30px_rgba(23,56,42,0.05)] sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Восстановление пароля</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Укажите рабочий email. Если аккаунт есть, отправим ссылку для нового пароля.
      </p>
      <form
        className="mt-6 flex flex-col gap-4"
        onSubmit={form.handleSubmit(async (values) => {
          setSuccess(null);
          const result = await requestPasswordReset(values);
          if (result && "error" in result) {
            form.setError("root", { message: result.error });
            return;
          }
          if (result && "success" in result) {
            setSuccess(result.success);
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
            {...form.register("email")}
          />
          {form.formState.errors.email ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.email.message}
            </p>
          ) : null}
        </div>
        {form.formState.errors.root ? (
          <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-2xl bg-primary/15 px-3 py-2 text-sm">{success}</p>
        ) : null}
        <Button type="submit" disabled={!configured || form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Отправляем..." : "Отправить ссылку"}
        </Button>
      </form>
      <Link href="/login" className="mt-5 inline-block text-sm text-primary">
        Вернуться ко входу
      </Link>
    </div>
  );
}
