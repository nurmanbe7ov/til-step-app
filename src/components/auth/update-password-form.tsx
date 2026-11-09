"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updatePassword } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updatePasswordSchema,
  type UpdatePasswordInput,
} from "@/lib/validation/auth";

export function UpdatePasswordForm({ configured }: { configured: boolean }) {
  const form = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-[0_10px_30px_rgba(23,56,42,0.05)] sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Новый пароль</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Придумайте пароль не короче 8 символов.
      </p>
      <form
        className="mt-6 flex flex-col gap-4"
        onSubmit={form.handleSubmit(async (values) => {
          const result = await updatePassword(values);
          if (result && "error" in result) {
            form.setError("root", { message: result.error });
          }
        })}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Новый пароль</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            disabled={!configured}
            {...form.register("password")}
          />
          {form.formState.errors.password ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.password.message}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmPassword">Повторите пароль</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            disabled={!configured}
            {...form.register("confirmPassword")}
          />
          {form.formState.errors.confirmPassword ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.confirmPassword.message}
            </p>
          ) : null}
        </div>
        {form.formState.errors.root ? (
          <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        ) : null}
        <Button type="submit" disabled={!configured || form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Сохраняем..." : "Сохранить пароль"}
        </Button>
      </form>
    </div>
  );
}
