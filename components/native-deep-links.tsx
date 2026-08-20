"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { initNativeDeepLinks } from "@/lib/native";

// Universal-Link-Weiche für die native Hülle — bewusst im Root-Layout und
// damit auf JEDER Route montiert, auch auf den Auth-Seiten ausserhalb der
// App-Shell. Vorher hing die Initialisierung an "eingeloggt" (app-shell.tsx),
// wodurch genau die Links ins Leere liefen, die Ausgeloggte bekommen:
// Passwort-Reset und Invite. Im Browser ist die Komponente ein No-op.
export function NativeDeepLinks() {
  const router = useRouter();
  useEffect(() => {
    initNativeDeepLinks((path) => router.replace(path));
  }, [router]);
  return null;
}
