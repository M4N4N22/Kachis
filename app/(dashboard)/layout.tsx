import { AppShell } from "@/components/shell/app-shell";
import { AppProvider } from "@/lib/app-store";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProvider>
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}
