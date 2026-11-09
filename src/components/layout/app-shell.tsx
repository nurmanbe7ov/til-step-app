"use client";

import {
  BookOpen,
  ChartLine,
  Flame,
  House,
  Library,
  Shield,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAppData } from "@/components/layout/app-data";
import { Logo } from "@/components/layout/logo";
import type { UserRole } from "@/lib/auth/session";
import { pluralDays } from "@/lib/format";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Главная",
    icon: House,
    match: (pathname) => pathname === "/dashboard",
  },
  {
    href: "/learn",
    label: "Обучение",
    icon: BookOpen,
    match: (pathname) =>
      pathname === "/learn" || pathname.startsWith("/lesson"),
  },
  {
    href: "/vocabulary",
    label: "Словарь",
    icon: Library,
    match: (pathname) => pathname.startsWith("/vocabulary"),
  },
  {
    href: "/progress",
    label: "Прогресс",
    icon: ChartLine,
    match: (pathname) => pathname.startsWith("/progress"),
  },
  {
    href: "/profile",
    label: "Профиль",
    icon: UserRound,
    match: (pathname) => pathname.startsWith("/profile"),
  },
];

function NavLinks({
  pathname,
  role,
  compact = false,
}: {
  pathname: string;
  role: UserRole;
  compact?: boolean;
}) {
  return (
    <>
      {navItems.map((item) => {
        const active = item.match(pathname);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              active && "bg-secondary text-foreground",
              compact && "flex-col gap-1 px-1 py-2 text-[11px]",
            )}
          >
            <Icon className="size-5" aria-hidden />
            {item.label}
          </Link>
        );
      })}
      {role === "admin" ? (
        <Link
          href="/admin"
          aria-current={pathname.startsWith("/admin") ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            pathname.startsWith("/admin") && "bg-secondary text-foreground",
            compact && "flex-col gap-1 px-1 py-2 text-[11px]",
          )}
        >
          <Shield className="size-5" aria-hidden />
          Админ
        </Link>
      ) : null}
    </>
  );
}

export function AppChrome() {
  const pathname = usePathname();
  const { session } = useAppData();
  const { role, streak } = session.user;

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[260px] flex-col border-r border-border bg-card px-4 py-6 md:flex">
        <Logo href="/dashboard" />
        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Разделы">
          <NavLinks pathname={pathname} role={role} />
        </nav>
      </aside>
      <span className="fixed right-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground md:right-8">
        <Flame className="size-4" aria-hidden />
        {streak} {pluralDays(streak)}
      </span>
      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Разделы"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-between">
          <NavLinks pathname={pathname} role={role} compact />
        </div>
      </nav>
    </>
  );
}

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <div className="flex min-h-dvh flex-col pb-24 md:pb-0 md:pl-[260px]">
        <header className="flex items-center py-4 pl-4 pr-28 md:justify-end md:px-8">
          <div className="md:hidden">
            <Logo href="/dashboard" />
          </div>
        </header>
        <main className="flex-1 px-4 pb-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
