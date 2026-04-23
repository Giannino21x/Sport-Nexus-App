"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <Callback />
    </Suspense>
  );
}

function Callback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Anmeldung wird vorbereitet...");

  useEffect(() => {
    const supabase = createClient();
    const nextParam = searchParams.get("next") ?? "/dashboard";
    const next = nextParam.startsWith("/") ? nextParam : "/dashboard";

    const fail = (reason: string) => {
      router.replace(`/login?error=${encodeURIComponent(reason)}`);
    };

    const run = async () => {
      // 1) Implicit flow — tokens arrive in the URL fragment (#access_token=...).
      const rawHash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      if (rawHash) {
        const hashParams = new URLSearchParams(rawHash);
        const hashErr = hashParams.get("error_description") || hashParams.get("error");
        if (hashErr) return fail("reset_invalid");

        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) return fail("reset_invalid");
          document.cookie = "sn-mode=live; path=/; max-age=31536000; samesite=lax";
          router.replace(next);
          return;
        }
      }

      // 2) PKCE flow — ?code=... in the query.
      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) return fail("reset_invalid");
        document.cookie = "sn-mode=live; path=/; max-age=31536000; samesite=lax";
        router.replace(next);
        return;
      }

      setMessage("Kein gültiger Token.");
      fail("missing_code");
    };

    run();
  }, [router, searchParams]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F1EBDC",
        color: "#0A0A0A",
        fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
      }}
    >
      <div style={{ fontSize: 14, color: "#6B6456" }}>{message}</div>
    </div>
  );
}
