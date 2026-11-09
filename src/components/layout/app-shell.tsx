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
              compact &&
                "min-w-0 flex-col items-center gap-1 px-0.5 py-2 text-center text-[clamp(9px,2.5vw,11px)] leading-none",
            )}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            {compact ? (
              <span className="w-full truncate text-center">{item.label}</span>
            ) : (
              item.label
            )}
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
            compact &&
              "min-w-0 flex-col items-center gap-1 px-0.5 py-2 text-center text-[clamp(9px,2.5vw,11px)] leading-none",
          )}
        >
          <Shield className="size-5 shrink-0" aria-hidden />
          {compact ? <span className="w-full truncate text-center">Админ</span> : "Админ"}
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
        className="fixed inset-x-0 bottom-0 z-20 w-full max-w-full overflow-hidden border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Разделы"
      >
        <div className="grid w-full auto-cols-fr grid-flow-col">
          <NavLinks pathname={pathname} role={role} compact />
        </div>
      </nav>
    </>
  );
}

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 overflow-x-hidden overflow-y-auto overscroll-y-contain bg-background">
      <div className="flex min-h-full w-full min-w-0 max-w-full flex-col pb-24 md:pb-0 md:pl-[260px]">
        <header className="flex min-w-0 items-center py-4 pl-4 pr-28 md:justify-end md:px-8">
          <div className="min-w-0 md:hidden">
            <Logo href="/dashboard" />
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-x-hidden px-4 pb-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
