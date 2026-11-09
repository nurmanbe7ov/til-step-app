import { Suspense } from "react";
import { PageLoader } from "@/components/common/page-loader";
import { AppDataProvider } from "@/components/layout/app-data";
import { AppChrome, AppFrame } from "@/components/layout/app-shell";
import { OnboardingTour } from "@/components/onboarding/onboarding-tour";
import { loadWorkspace } from "@/lib/app/workspace";

function ChromeFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <PageLoader label="Открываем TilStep." />
    </div>
  );
}

async function SessionShell({ children }: { children: React.ReactNode }) {
  const workspace = await loadWorkspace();

  return (
    <AppDataProvider initial={workspace}>
      <AppChrome />
      <AppFrame>{children}</AppFrame>
      <OnboardingTour />
    </AppDataProvider>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ChromeFallback />}>
      <SessionShell>{children}</SessionShell>
    </Suspense>
  );
}
