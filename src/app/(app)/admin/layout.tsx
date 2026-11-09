"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppData } from "@/components/layout/app-data";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = useAppData();
  const router = useRouter();
  const allowed = session.mode === "mock" || session.user.role === "admin";

  useEffect(() => {
    if (!allowed) {
      router.replace("/dashboard");
    }
  }, [allowed, router]);

  if (!allowed) {
    return null;
  }

  return children;
}
