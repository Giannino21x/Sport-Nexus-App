import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // All routes except static assets + images
    "/((?!_next/static|_next/image|favicon.ico|logo-sportnexus|.*\\.(?:png|jpg|jpeg|svg|webp|avif|ico)).*)",
  ],
};
