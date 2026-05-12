import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { DEFAULT_LOCALE, isLocale, localePath } from "@/i18n/config";
import { getCalendarConnectionStatus } from "@/app/actions/composio";
import type { CalendarConnectionStatus } from "@/app/actions/composio";
import { AgentChat } from "./agent-chat";

export const metadata = { title: "Agent — Admin" };

export default async function AdminAgentPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  await cookies();
  const { lang: langRaw } = await params;
  const lang = isLocale(langRaw) ? langRaw : DEFAULT_LOCALE;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect(localePath(lang, "/admin/login") + `?next=${encodeURIComponent(`/${lang}/admin/agent`)}`);
  }
  if (
    env.allowedAdminEmails.length > 0 &&
    !env.allowedAdminEmails.includes(user.email.toLowerCase())
  ) {
    redirect(localePath(lang, "/admin/login") + "?error=not_allowed");
  }

  // Best-effort calendar status — never block page render if Composio is down.
  let initialCalendarStatus: CalendarConnectionStatus = { status: "not_connected" };
  try {
    initialCalendarStatus = await getCalendarConnectionStatus();
  } catch {
    // Leave as not_connected; the pill will show "Connect" and a manual click
    // will surface any real errors at that point.
  }

  return (
    <AgentChat
      adminEmail={user.email}
      backHref={localePath(lang, "/admin")}
      hasApiKey={Boolean(env.groqApiKey)}
      initialCalendarStatus={initialCalendarStatus}
    />
  );
}
