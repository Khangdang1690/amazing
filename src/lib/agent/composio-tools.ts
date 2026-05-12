import "server-only";
import { Composio } from "@composio/core";
import { env } from "@/lib/env";
import type { ToolResult } from "@/lib/agent/tools";

type Args = Record<string, unknown>;

let _client: Composio | null = null;
function getClient(): Composio {
  if (!_client) {
    _client = new Composio({ apiKey: env.composioApiKey });
  }
  return _client;
}

function str(args: Args, key: string): string | undefined {
  const v = args[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function num(args: Args, key: string): number | undefined {
  const v = args[key];
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.length > 0 && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return undefined;
}

function strArr(args: Args, key: string): string[] | undefined {
  const v = args[key];
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((x): x is string => typeof x === "string" && x.length > 0);
  return out.length > 0 ? out : undefined;
}

function configError(missing: string): ToolResult {
  return {
    ok: false,
    error: `Composio not configured: ${missing} is missing.`,
    summary: `Composio not configured: ${missing} is missing.`,
  };
}

function execError(action: string, e: unknown): ToolResult {
  const msg = e instanceof Error ? e.message : `Composio ${action} failed.`;
  return { ok: false, error: msg, summary: `${action}: ${msg}` };
}

function ensureConfigured(): ToolResult | null {
  if (!env.composioApiKey) return configError("COMPOSIO_API_KEY");
  if (!env.composioUserId) return configError("COMPOSIO_USER_ID");
  return null;
}

/**
 * Composio's `tools.execute()` returns `{ successful, data, error }` and only
 * throws on transport/auth failures. A failed downstream API call (Google
 * returning 4xx, event-not-found, etc.) surfaces as `successful: false` with
 * a populated `error` string. Without this check the agent would think the
 * action worked. Critical: the LLM also reads `data`, so we keep it in the
 * payload either way to preserve context for retries with corrections.
 */
function wrapResult(
  action: string,
  result: { successful: boolean; data: unknown; error: string | null },
  okSummary: string,
): ToolResult {
  if (result.successful) {
    return { ok: true, data: result.data, summary: okSummary };
  }
  const errMsg = result.error ?? `${action} failed without an error message.`;
  return {
    ok: false,
    data: result.data,
    error: errMsg,
    summary: `${action}: ${errMsg}`,
  };
}

export async function gcalCreateEvent(args: Args): Promise<ToolResult> {
  const cfg = ensureConfigured();
  if (cfg) return cfg;

  const summary = str(args, "summary");
  const startIso = str(args, "start_iso");
  const endIso = str(args, "end_iso");
  if (!summary || !startIso || !endIso) {
    return {
      ok: false,
      error: "summary, start_iso, end_iso are required.",
      summary: "Missing required fields for Google Calendar event.",
    };
  }

  const description = str(args, "description");
  const attendees = strArr(args, "attendees");
  const calendarId = str(args, "calendar_id") ?? "primary";

  try {
    const result = await getClient().tools.execute("GOOGLECALENDAR_CREATE_EVENT", {
      userId: env.composioUserId,
      dangerouslySkipVersionCheck: true,
      arguments: {
        calendar_id: calendarId,
        summary,
        start_datetime: startIso,
        end_datetime: endIso,
        ...(description ? { description } : {}),
        ...(attendees ? { attendees } : {}),
      },
    });

    return wrapResult(
      "GOOGLECALENDAR_CREATE_EVENT",
      result,
      `Created Google Calendar event "${summary}" (${startIso} → ${endIso}).`,
    );
  } catch (e) {
    return execError("GOOGLECALENDAR_CREATE_EVENT", e);
  }
}

export async function gcalListEvents(args: Args): Promise<ToolResult> {
  const cfg = ensureConfigured();
  if (cfg) return cfg;

  const timeMin = str(args, "time_min_iso");
  const timeMax = str(args, "time_max_iso");
  const query = str(args, "query");
  const maxResults = Math.min(num(args, "max_results") ?? 25, 100);
  const calendarId = str(args, "calendar_id") ?? "primary";

  try {
    const result = await getClient().tools.execute("GOOGLECALENDAR_FIND_EVENT", {
      userId: env.composioUserId,
      dangerouslySkipVersionCheck: true,
      arguments: {
        calendar_id: calendarId,
        ...(timeMin ? { time_min: timeMin } : {}),
        ...(timeMax ? { time_max: timeMax } : {}),
        ...(query ? { query } : {}),
        max_results: maxResults,
        single_events: true,
        order_by: "startTime",
      },
    });

    return wrapResult(
      "GOOGLECALENDAR_FIND_EVENT",
      result,
      `Listed Google Calendar events${timeMin ? ` from ${timeMin}` : ""}${timeMax ? ` to ${timeMax}` : ""}${query ? ` matching "${query}"` : ""}.`,
    );
  } catch (e) {
    return execError("GOOGLECALENDAR_FIND_EVENT", e);
  }
}

export async function gcalGetEvent(args: Args): Promise<ToolResult> {
  const cfg = ensureConfigured();
  if (cfg) return cfg;

  const eventId = str(args, "event_id");
  if (!eventId) {
    return {
      ok: false,
      error: "event_id is required.",
      summary: "Missing event_id for Google Calendar lookup.",
    };
  }
  const calendarId = str(args, "calendar_id") ?? "primary";

  try {
    const result = await getClient().tools.execute("GOOGLECALENDAR_EVENTS_GET", {
      userId: env.composioUserId,
      dangerouslySkipVersionCheck: true,
      arguments: {
        event_id: eventId,
        calendar_id: calendarId,
      },
    });

    return wrapResult(
      "GOOGLECALENDAR_EVENTS_GET",
      result,
      `Fetched Google Calendar event ${eventId}.`,
    );
  } catch (e) {
    return execError("GOOGLECALENDAR_EVENTS_GET", e);
  }
}

export async function gcalUpdateEvent(args: Args): Promise<ToolResult> {
  const cfg = ensureConfigured();
  if (cfg) return cfg;

  const eventId = str(args, "event_id");
  if (!eventId) {
    return {
      ok: false,
      error: "event_id is required.",
      summary: "Missing event_id for Google Calendar update.",
    };
  }

  const summary = str(args, "summary");
  const startIso = str(args, "start_iso");
  const endIso = str(args, "end_iso");
  const description = str(args, "description");
  const attendees = strArr(args, "attendees");
  const calendarId = str(args, "calendar_id") ?? "primary";

  // PATCH_EVENT uses start_time/end_time (NOT start_datetime/end_datetime like
  // CREATE_EVENT does — Composio's arg names are inconsistent across actions
  // in the same toolkit). Map our LLM-facing names to whatever each action wants.
  const patchArgs: Record<string, unknown> = {
    event_id: eventId,
    calendar_id: calendarId,
    ...(summary ? { summary } : {}),
    ...(startIso ? { start_time: startIso } : {}),
    ...(endIso ? { end_time: endIso } : {}),
    ...(description ? { description } : {}),
    ...(attendees ? { attendees } : {}),
  };

  try {
    const result = await getClient().tools.execute("GOOGLECALENDAR_PATCH_EVENT", {
      userId: env.composioUserId,
      dangerouslySkipVersionCheck: true,
      arguments: patchArgs,
    });

    return wrapResult(
      "GOOGLECALENDAR_PATCH_EVENT",
      result,
      `Updated Google Calendar event ${eventId}.`,
    );
  } catch (e) {
    return execError("GOOGLECALENDAR_PATCH_EVENT", e);
  }
}

export async function gcalDeleteEvent(args: Args): Promise<ToolResult> {
  const cfg = ensureConfigured();
  if (cfg) return cfg;

  const eventId = str(args, "event_id");
  if (!eventId) {
    return {
      ok: false,
      error: "event_id is required.",
      summary: "Missing event_id for Google Calendar deletion.",
    };
  }
  const calendarId = str(args, "calendar_id") ?? "primary";

  try {
    const result = await getClient().tools.execute("GOOGLECALENDAR_DELETE_EVENT", {
      userId: env.composioUserId,
      dangerouslySkipVersionCheck: true,
      arguments: {
        event_id: eventId,
        calendar_id: calendarId,
      },
    });

    return wrapResult(
      "GOOGLECALENDAR_DELETE_EVENT",
      result,
      `Deleted Google Calendar event ${eventId}.`,
    );
  } catch (e) {
    return execError("GOOGLECALENDAR_DELETE_EVENT", e);
  }
}
