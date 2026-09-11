import { OnboardingGate } from "@/components/onboarding/onboarding-gate";
import { AppShell } from "@/components/shell/app-shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnboardingGate>
      <AppShell>{children}</AppShell>
    </OnboardingGate>
  );
}
