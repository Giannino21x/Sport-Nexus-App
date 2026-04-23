import { createClient } from "@/lib/supabase/server";
import { ResetPasswordClient } from "./client";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return <ResetPasswordClient hasSession={!!user} email={user?.email ?? ""} />;
}
