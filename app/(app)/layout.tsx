import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { SettingsProvider } from "@/components/settings-context";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <AppShell>{children}</AppShell>
    </SettingsProvider>
  );
}
