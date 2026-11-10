"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useAppData } from "@/components/layout/app-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { signOut } from "@/lib/auth/actions";
import type { UserRole } from "@/lib/auth/session";

function roleLabel(role: UserRole): string {
  return role === "admin" ? "Администратор" : "Сотрудник";
}

function SignOutConfirm({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
        Остаться
      </Button>
      <Button
        type="submit"
        disabled={pending}
        className="bg-destructive text-primary-foreground hover:bg-destructive/90"
      >
        {pending ? "Выходим…" : "Выйти"}
      </Button>
    </div>
  );
}

export function ProfileScreen() {
  const { session } = useAppData();
  const [confirming, setConfirming] = useState(false);
  const initial = session.user.fullName.trim().charAt(0).toUpperCase() || "Т";

  return (
    <section className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Профиль</h1>
      <Card className="flex flex-col gap-5 p-6">
        <div className="flex items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-xl font-semibold">
            {initial}
          </span>
          <div>
            <p className="text-lg font-semibold">{session.user.fullName}</p>
            <p className="text-sm text-muted-foreground">{session.user.email}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Роль: {roleLabel(session.user.role)}
        </p>
        {session.mode === "mock" ? (
          <p className="text-sm leading-6 text-muted-foreground">
            Это демонстрационный профиль. После подключения Supabase здесь будут
            данные вошедшего сотрудника.
          </p>
        ) : (
          <>
            <Button type="button" variant="outline" onClick={() => setConfirming(true)}>
              Выйти
            </Button>
            {confirming ? (
              <div
                className="fixed inset-0 z-40 flex items-center justify-center bg-[#17382A]/45 p-4"
                role="presentation"
                onClick={() => setConfirming(false)}
              >
                <section
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby="sign-out-title"
                  className="w-full max-w-sm rounded-3xl bg-card px-5 py-5 shadow-[0_20px_60px_rgba(23,56,42,0.18)]"
                  onClick={(event) => event.stopPropagation()}
                >
                  <h2 id="sign-out-title" className="text-lg font-semibold">
                    Выйти из профиля?
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Чтобы снова открыть уроки, нужно будет войти.
                  </p>
                  <form action={signOut} className="mt-5">
                    <SignOutConfirm onCancel={() => setConfirming(false)} />
                  </form>
                </section>
              </div>
            ) : null}
          </>
        )}
        {session.user.role === "admin" ? (
          <Link href="/admin" className="text-sm font-medium text-primary">
            Открыть админ-панель
          </Link>
        ) : null}
      </Card>
    </section>
  );
}
