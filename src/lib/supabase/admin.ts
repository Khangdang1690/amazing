import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Secret-key client. Bypasses RLS. NEVER import from client code.
export function createSupabaseAdminClient() {
  if (!env.supabaseSecretKey) {
    throw new Error("SUPABASE_SECRET_KEY is not set");
  }
  return createClient(env.supabaseUrl, env.supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
