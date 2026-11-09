"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { reloadWorkspace } from "@/lib/app/actions";
import type { AppWorkspace } from "@/lib/app/workspace";

type AppDataValue = AppWorkspace & {
  reload: () => Promise<void>;
  markOnboardingDone: () => void;
};

const AppDataContext = createContext<AppDataValue | null>(null);

export function AppDataProvider({
  initial,
  children,
}: {
  initial: AppWorkspace;
  children: ReactNode;
}) {
  const [workspace, setWorkspace] = useState(initial);

  useEffect(() => {
    setWorkspace((current) => {
      if (
        current.session.user.onboardingCompleted &&
        !initial.session.user.onboardingCompleted
      ) {
        return {
          ...initial,
          session: {
            ...initial.session,
            user: {
              ...initial.session.user,
              onboardingCompleted: true,
            },
          },
        };
      }

      return initial;
    });
  }, [initial]);

  const reload = useCallback(async () => {
    const next = await reloadWorkspace();
    setWorkspace(next);
  }, []);

  const markOnboardingDone = useCallback(() => {
    setWorkspace((current) => ({
      ...current,
      session: {
        ...current.session,
        user: {
          ...current.session.user,
          onboardingCompleted: true,
        },
      },
    }));
  }, []);

  const value = useMemo<AppDataValue>(
    () => ({
      ...workspace,
      reload,
      markOnboardingDone,
    }),
    [workspace, reload, markOnboardingDone],
  );

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData(): AppDataValue {
  const value = useContext(AppDataContext);

  if (!value) {
    throw new Error("Данные приложения ещё не загружены");
  }

  return value;
}
