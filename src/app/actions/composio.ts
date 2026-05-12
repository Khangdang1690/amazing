"use server";

import { Composio } from "@composio/core";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Not authenticated");
  if (
    env.allowedAdminEmails.length > 0 &&
    !env.allowedAdminEmails.includes(user.email.toLowerCase())
  ) {
    throw new Error("Not authorized");
  }
  return user;
}

let _client: Composio | null = null;
function getClient(): Composio {
  if (!_client) {
    _client = new Composio({ apiKey: env.composioApiKey });
  }
  return _client;
}

export type CalendarConnectionStatus =
  | {
      status: "connected";
      connectionId: string;
      accountEmail?: string;
    }
  | { status: "not_connected" };

/**
 * Look up the Composio user's existing ACTIVE Google Calendar connection, if any.
 * Used both for the initial page render and for polling after the user clicks
 * Connect.
 */
export async function getCalendarConnectionStatus(): Promise<CalendarConnectionStatus> {
  await requireAdmin();

  if (!env.composioApiKey || !env.composioUserId) {
    return { status: "not_connected" };
  }

  const result = (await getClient().connectedAccounts.list({
    userIds: [env.composioUserId],
    toolkitSlugs: ["googlecalendar"],
  })) as unknown as { items?: Array<Record<string, unknown>> };

  const items = Array.isArray(result?.items) ? result.items : [];
  const active = items.find((it) => it?.status === "ACTIVE");
  if (!active) return { status: "not_connected" };

  const connectionId = typeof active.id === "string" ? active.id : undefined;
  if (!connectionId) return { status: "not_connected" };

  // Try to extract an email from the connection params. Composio puts auth
  // metadata in different fields depending on the toolkit; we look in the
  // most common spots and fall back to undefined if we can't find one.
  const data = (active.data ?? {}) as Record<string, unknown>;
  const params = (active.params ?? {}) as Record<string, unknown>;
  const accountEmail =
    (typeof data.email === "string" && data.email) ||
    (typeof params.email === "string" && params.email) ||
    undefined;

  return {
    status: "connected",
    connectionId,
    ...(accountEmail ? { accountEmail } : {}),
  };
}

/**
 * Start a new OAuth connection. Returns the redirect URL the client should
 * open in a new tab. After the user finishes Google sign-in, the client polls
 * getCalendarConnectionStatus() until status flips to "connected".
 */
export async function initiateCalendarConnection(): Promise<{
  redirectUrl: string;
  connectionId: string;
}> {
  await requireAdmin();

  if (!env.composioApiKey) throw new Error("COMPOSIO_API_KEY is not set.");
  if (!env.composioUserId) throw new Error("COMPOSIO_USER_ID is not set.");
  if (!env.composioGcalAuthConfigId) {
    throw new Error("COMPOSIO_GCAL_AUTH_CONFIG_ID is not set.");
  }

  // `initiate()` was retired 2026-04-24; `link()` is the replacement.
  const request = await getClient().connectedAccounts.link(
    env.composioUserId,
    env.composioGcalAuthConfigId,
  );

  if (!request.redirectUrl) {
    throw new Error(
      "Composio did not return a redirect URL. The auth config may not be OAuth.",
    );
  }

  return { redirectUrl: request.redirectUrl, connectionId: request.id };
}

/**
 * Delete a Composio connected account, fully disconnecting the Google account.
 */
export async function disconnectCalendar(connectionId: string): Promise<void> {
  await requireAdmin();
  if (!connectionId) throw new Error("connectionId is required.");
  await getClient().connectedAccounts.delete(connectionId);
}
