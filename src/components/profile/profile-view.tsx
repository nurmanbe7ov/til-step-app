"use client";

import Link from "next/link";
import { useAppData } from "@/components/layout/app-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { signOut } from "@/lib/auth/actions";
import type { UserRole } from "@/lib/auth/session";

function roleLabel(role: UserRole): string {
  return role === "admin" ? "Администратор" : "Сотрудник";
}

export function ProfileScreen() {
  const { session } = useAppData();
  const initial = session.user.fullName.trim().charAt(0).toUpperCase() || "Т";

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
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
          <form action={signOut}>
            <Button type="submit" variant="outline">
              Выйти
            </Button>
          </form>
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
