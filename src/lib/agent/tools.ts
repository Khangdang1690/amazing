import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import type { SupabaseClient } from "@supabase/supabase-js";

export type FunctionDeclaration = {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

export type ToolResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
  summary: string;
};

type Args = Record<string, unknown>;

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
function bool(args: Args, key: string): boolean | undefined {
  const v = args[key];
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

const APPOINTMENT_STATUSES = [
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
] as const;
type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

function isStatus(v: string | undefined): v is AppointmentStatus {
  return !!v && (APPOINTMENT_STATUSES as readonly string[]).includes(v);
}

async function listAppointments(
  s: SupabaseClient,
  args: Args,
): Promise<ToolResult> {
  const limit = Math.min(num(args, "limit") ?? 50, 200);
  const status = str(args, "status");
  const barberId = str(args, "barber_id");
  const serviceId = str(args, "service_id");
  const from = str(args, "from_iso");
  const to = str(args, "to_iso");

  let q = s
    .from("appointments")
    .select(
      `id, customer_name, customer_phone, starts_at, ends_at, status, notes, internal_notes,
       barbers ( id, name ), services ( id, name, duration_minutes, price_cents )`,
    )
    .order("starts_at", { ascending: false })
    .limit(limit);

  if (isStatus(status)) q = q.eq("status", status);
  if (barberId) q = q.eq("barber_id", barberId);
  if (serviceId) q = q.eq("service_id", serviceId);
  if (from) q = q.gte("starts_at", from);
  if (to) q = q.lte("starts_at", to);

  const { data, error } = await q;
  if (error) return { ok: false, error: error.message, summary: error.message };
  return {
    ok: true,
    data,
    summary: `Found ${data?.length ?? 0} appointment(s).`,
  };
}

async function getAppointment(s: SupabaseClient, args: Args): Promise<ToolResult> {
  const id = str(args, "id");
  if (!id) return { ok: false, error: "id required", summary: "Missing id." };
  const { data, error } = await s
    .from("appointments")
    .select(
      `id, customer_name, customer_phone, starts_at, ends_at, status, notes, internal_notes,
       barbers ( id, name, slug ), services ( id, name, duration_minutes, price_cents )`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) return { ok: false, error: error.message, summary: error.message };
  if (!data) return { ok: false, error: "not found", summary: "No appointment found." };
  return { ok: true, data, summary: `Loaded appointment ${id}.` };
}

async function updateAppointmentStatus(
  s: SupabaseClient,
  args: Args,
): Promise<ToolResult> {
  const id = str(args, "id");
  const status = str(args, "status");
  if (!id) return { ok: false, error: "id required", summary: "Missing id." };
  if (!isStatus(status)) {
    return {
      ok: false,
      error: "invalid status",
      summary: `Status must be one of ${APPOINTMENT_STATUSES.join(", ")}.`,
    };
  }
  const { error } = await s
    .from("appointments")
    .update({ status })
    .eq("id", id);
  if (error) return { ok: false, error: error.message, summary: error.message };
  return { ok: true, summary: `Set appointment ${id} status to ${status}.` };
}

async function updateAppointmentNotes(
  s: SupabaseClient,
  args: Args,
): Promise<ToolResult> {
  const id = str(args, "id");
  const internal_notes = str(args, "internal_notes") ?? "";
  if (!id) return { ok: false, error: "id required", summary: "Missing id." };
  const { error } = await s
    .from("appointments")
    .update({ internal_notes })
    .eq("id", id);
  if (error) return { ok: false, error: error.message, summary: error.message };
  return { ok: true, summary: `Updated internal notes on ${id}.` };
}

async function listBarbers(s: SupabaseClient, args: Args): Promise<ToolResult> {
  const active = bool(args, "active_only");
  let q = s.from("barbers").select("*").order("display_order");
  if (active) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) return { ok: false, error: error.message, summary: error.message };
  return { ok: true, data, summary: `Found ${data?.length ?? 0} barber(s).` };
}

async function upsertBarber(s: SupabaseClient, args: Args): Promise<ToolResult> {
  const id = str(args, "id");
  const row: Record<string, unknown> = {
    name: str(args, "name"),
    slug: str(args, "slug"),
    bio: str(args, "bio") ?? null,
    avatar_url: str(args, "avatar_url") ?? null,
    active: bool(args, "active") ?? true,
    display_order: num(args, "display_order") ?? 0,
  };
  if (!row.name || !row.slug) {
    return { ok: false, error: "name and slug required", summary: "Need name and slug." };
  }
  const { data, error } = id
    ? await s.from("barbers").update(row).eq("id", id).select("id").maybeSingle()
    : await s.from("barbers").insert(row).select("id").maybeSingle();
  if (error) return { ok: false, error: error.message, summary: error.message };
  return {
    ok: true,
    data,
    summary: id ? `Updated barber ${id}.` : `Created barber ${data?.id ?? ""}.`,
  };
}

async function deleteBarber(s: SupabaseClient, args: Args): Promise<ToolResult> {
  const id = str(args, "id");
  if (!id) return { ok: false, error: "id required", summary: "Missing id." };
  const { error } = await s.from("barbers").delete().eq("id", id);
  if (error) return { ok: false, error: error.message, summary: error.message };
  return { ok: true, summary: `Deleted barber ${id}.` };
}

async function listServices(s: SupabaseClient, args: Args): Promise<ToolResult> {
  const active = bool(args, "active_only");
  let q = s.from("services").select("*").order("display_order");
  if (active) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) return { ok: false, error: error.message, summary: error.message };
  return { ok: true, data, summary: `Found ${data?.length ?? 0} service(s).` };
}

async function upsertService(s: SupabaseClient, args: Args): Promise<ToolResult> {
  const id = str(args, "id");
  const row: Record<string, unknown> = {
    name: str(args, "name"),
    description: str(args, "description") ?? null,
    duration_minutes: num(args, "duration_minutes"),
    price_cents: num(args, "price_cents"),
    active: bool(args, "active") ?? true,
    display_order: num(args, "display_order") ?? 0,
  };
  if (
    !row.name ||
    typeof row.duration_minutes !== "number" ||
    typeof row.price_cents !== "number"
  ) {
    return {
      ok: false,
      error: "name, duration_minutes, price_cents required",
      summary: "Need name, duration_minutes, price_cents.",
    };
  }
  const { data, error } = id
    ? await s.from("services").update(row).eq("id", id).select("id").maybeSingle()
    : await s.from("services").insert(row).select("id").maybeSingle();
  if (error) return { ok: false, error: error.message, summary: error.message };

  if (!id && data?.id) {
    const { data: barbers } = await s
      .from("barbers")
      .select("id")
      .eq("active", true);
    if (barbers && barbers.length > 0) {
      await s.from("barber_services").insert(
        barbers.map((b) => ({ barber_id: b.id, service_id: data.id })),
      );
    }
  }
  return {
    ok: true,
    data,
    summary: id ? `Updated service ${id}.` : `Created service ${data?.id ?? ""}.`,
  };
}

async function deleteService(s: SupabaseClient, args: Args): Promise<ToolResult> {
  const id = str(args, "id");
  if (!id) return { ok: false, error: "id required", summary: "Missing id." };
  const { error } = await s.from("services").delete().eq("id", id);
  if (error) return { ok: false, error: error.message, summary: error.message };
  return { ok: true, summary: `Deleted service ${id}.` };
}

async function getShopHours(s: SupabaseClient): Promise<ToolResult> {
  const { data, error } = await s
    .from("shop_hours")
    .select("*")
    .order("day_of_week");
  if (error) return { ok: false, error: error.message, summary: error.message };
  return { ok: true, data, summary: `Loaded ${data?.length ?? 0} hour row(s).` };
}

async function updateShopHoursDay(
  s: SupabaseClient,
  args: Args,
): Promise<ToolResult> {
  const dow = num(args, "day_of_week");
  if (dow === undefined || dow < 0 || dow > 6) {
    return {
      ok: false,
      error: "day_of_week 0-6 required",
      summary: "day_of_week must be 0 (Sunday) through 6 (Saturday).",
    };
  }
  const closed = bool(args, "closed") ?? false;
  const open = str(args, "open_time");
  const close = str(args, "close_time");
  const { error } = await s.from("shop_hours").upsert(
    {
      day_of_week: dow,
      open_time: closed ? null : open ?? null,
      close_time: closed ? null : close ?? null,
      closed,
    },
    { onConflict: "day_of_week" },
  );
  if (error) return { ok: false, error: error.message, summary: error.message };
  return { ok: true, summary: `Updated hours for day_of_week=${dow}.` };
}

async function listTimeOff(s: SupabaseClient, args: Args): Promise<ToolResult> {
  const barberId = str(args, "barber_id");
  let q = s
    .from("time_off")
    .select("id, barber_id, starts_at, ends_at, reason, barbers ( name )")
    .order("starts_at", { ascending: false })
    .limit(100);
  if (barberId) q = q.eq("barber_id", barberId);
  const { data, error } = await q;
  if (error) return { ok: false, error: error.message, summary: error.message };
  return { ok: true, data, summary: `Found ${data?.length ?? 0} time-off row(s).` };
}

async function createTimeOff(
  s: SupabaseClient,
  args: Args,
): Promise<ToolResult> {
  const starts_at = str(args, "starts_at");
  const ends_at = str(args, "ends_at");
  const barber_id = str(args, "barber_id") ?? null;
  const reason = str(args, "reason") ?? null;
  if (!starts_at || !ends_at) {
    return {
      ok: false,
      error: "starts_at and ends_at required (ISO 8601)",
      summary: "Need starts_at and ends_at in ISO 8601.",
    };
  }
  const { data, error } = await s
    .from("time_off")
    .insert({ barber_id, starts_at, ends_at, reason })
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message, summary: error.message };
  return { ok: true, data, summary: `Created time-off ${data?.id ?? ""}.` };
}

async function deleteTimeOff(s: SupabaseClient, args: Args): Promise<ToolResult> {
  const id = str(args, "id");
  if (!id) return { ok: false, error: "id required", summary: "Missing id." };
  const { error } = await s.from("time_off").delete().eq("id", id);
  if (error) return { ok: false, error: error.message, summary: error.message };
  return { ok: true, summary: `Deleted time-off ${id}.` };
}

async function listGalleryPhotos(s: SupabaseClient): Promise<ToolResult> {
  const { data, error } = await s
    .from("gallery_photos")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return { ok: false, error: error.message, summary: error.message };
  return { ok: true, data, summary: `Found ${data?.length ?? 0} photo(s).` };
}

async function deleteGalleryPhoto(
  s: SupabaseClient,
  args: Args,
): Promise<ToolResult> {
  const id = str(args, "id");
  const storage_path = str(args, "storage_path");
  if (!id || !storage_path) {
    return {
      ok: false,
      error: "id and storage_path required",
      summary: "Need id and storage_path.",
    };
  }
  await s.storage.from("gallery").remove([storage_path]);
  const { error } = await s.from("gallery_photos").delete().eq("id", id);
  if (error) return { ok: false, error: error.message, summary: error.message };
  return { ok: true, summary: `Deleted photo ${id}.` };
}

async function countAppointments(
  s: SupabaseClient,
  args: Args,
): Promise<ToolResult> {
  const status = str(args, "status");
  const from = str(args, "from_iso");
  const to = str(args, "to_iso");
  let q = s
    .from("appointments")
    .select("id", { count: "exact", head: true });
  if (isStatus(status)) q = q.eq("status", status);
  if (from) q = q.gte("starts_at", from);
  if (to) q = q.lte("starts_at", to);
  const { count, error } = await q;
  if (error) return { ok: false, error: error.message, summary: error.message };
  return { ok: true, data: { count }, summary: `Count = ${count ?? 0}.` };
}

type TavilyRawResult = { title?: unknown; url?: unknown; content?: unknown };

async function webSearch(
  _s: SupabaseClient,
  args: Args,
): Promise<ToolResult> {
  const query = str(args, "query");
  if (!query) {
    return {
      ok: false,
      error: "query is required.",
      summary: "web_search failed: query is required.",
    };
  }
  if (!env.tavilyApiKey) {
    return {
      ok: false,
      error: "TAVILY_API_KEY is not configured.",
      summary: "web_search failed: TAVILY_API_KEY is not configured.",
    };
  }
  const requested = num(args, "max_results") ?? 5;
  const maxResults = Math.max(1, Math.min(10, Math.trunc(requested)));

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.tavilyApiKey}`,
    },
    body: JSON.stringify({
      query,
      max_results: maxResults,
      search_depth: "basic",
      include_answer: false,
    }),
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const errJson = (await res.json()) as { detail?: unknown; error?: unknown };
      const d =
        typeof errJson.detail === "string"
          ? errJson.detail
          : typeof errJson.error === "string"
            ? errJson.error
            : undefined;
      if (d) detail = d;
    } catch {
      // body was not JSON; keep HTTP status as the detail
    }
    return {
      ok: false,
      error: detail,
      summary: `web_search failed: ${detail}`,
    };
  }

  const json = (await res.json()) as { results?: TavilyRawResult[] };
  const raw = Array.isArray(json.results) ? json.results : [];
  const results = raw.map((r) => ({
    title: typeof r.title === "string" ? r.title : "",
    url: typeof r.url === "string" ? r.url : "",
    snippet: typeof r.content === "string" ? r.content : "",
  }));

  return {
    ok: true,
    data: { query, results },
    summary: `Found ${results.length} result${results.length === 1 ? "" : "s"} for "${query}".`,
  };
}

type Handler = (s: SupabaseClient, args: Args) => Promise<ToolResult>;

const HANDLERS: Record<string, Handler> = {
  list_appointments: listAppointments,
  count_appointments: countAppointments,
  get_appointment: getAppointment,
  update_appointment_status: updateAppointmentStatus,
  update_appointment_notes: updateAppointmentNotes,
  list_barbers: listBarbers,
  upsert_barber: upsertBarber,
  delete_barber: deleteBarber,
  list_services: listServices,
  upsert_service: upsertService,
  delete_service: deleteService,
  get_shop_hours: getShopHours,
  update_shop_hours_day: updateShopHoursDay,
  list_time_off: listTimeOff,
  create_time_off: createTimeOff,
  delete_time_off: deleteTimeOff,
  list_gallery_photos: listGalleryPhotos,
  delete_gallery_photo: deleteGalleryPhoto,
  web_search: webSearch,
};

export async function runTool(
  name: string,
  args: Args,
): Promise<ToolResult> {
  const handler = HANDLERS[name];
  if (!handler) {
    return {
      ok: false,
      error: `Unknown tool: ${name}`,
      summary: `Unknown tool: ${name}`,
    };
  }
  try {
    const supabase = createSupabaseAdminClient();
    return await handler(supabase, args);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Tool execution failed.";
    return { ok: false, error: msg, summary: msg };
  }
}

export const FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "list_appointments",
    description:
      "List appointments with optional filters. Returns up to 200 rows.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description:
            "One of: confirmed, completed, cancelled, no_show. Omit for all.",
        },
        barber_id: { type: "string", description: "Filter by barber UUID." },
        service_id: { type: "string", description: "Filter by service UUID." },
        from_iso: {
          type: "string",
          description: "ISO 8601 lower bound for starts_at, inclusive.",
        },
        to_iso: {
          type: "string",
          description: "ISO 8601 upper bound for starts_at, inclusive.",
        },
        limit: {
          type: "integer",
          description: "Max rows (1-200, default 50).",
        },
      },
    },
  },
  {
    name: "count_appointments",
    description:
      "Count appointments matching optional status and date-range filters.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string" },
        from_iso: { type: "string" },
        to_iso: { type: "string" },
      },
    },
  },
  {
    name: "get_appointment",
    description: "Get full details for one appointment by UUID.",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "update_appointment_status",
    description:
      "Change appointment status. Allowed values: confirmed, completed, cancelled, no_show.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        status: { type: "string" },
      },
      required: ["id", "status"],
    },
  },
  {
    name: "update_appointment_notes",
    description: "Set the internal_notes field on an appointment (admin-only).",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        internal_notes: { type: "string" },
      },
      required: ["id", "internal_notes"],
    },
  },
  {
    name: "list_barbers",
    description: "List barbers ordered by display_order.",
    parameters: {
      type: "object",
      properties: {
        active_only: {
          type: "boolean",
          description: "If true, only active barbers.",
        },
      },
    },
  },
  {
    name: "upsert_barber",
    description:
      "Create or update a barber. Pass id to update, omit to create. Required for new: name, slug.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        slug: { type: "string" },
        bio: { type: "string" },
        avatar_url: { type: "string" },
        active: { type: "boolean" },
        display_order: { type: "integer" },
      },
    },
  },
  {
    name: "delete_barber",
    description: "Delete a barber by UUID.",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "list_services",
    description: "List services ordered by display_order.",
    parameters: {
      type: "object",
      properties: {
        active_only: { type: "boolean" },
      },
    },
  },
  {
    name: "upsert_service",
    description:
      "Create or update a service. Pass id to update. Required: name, duration_minutes, price_cents.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        duration_minutes: { type: "integer" },
        price_cents: { type: "integer" },
        active: { type: "boolean" },
        display_order: { type: "integer" },
      },
    },
  },
  {
    name: "delete_service",
    description: "Delete a service by UUID.",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "get_shop_hours",
    description:
      "Read the shop's weekly hours. Returns one row per day_of_week (0=Sun .. 6=Sat).",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "update_shop_hours_day",
    description:
      "Set open_time / close_time for one day_of_week (0-6). open_time/close_time are 'HH:MM' or 'HH:MM:SS'. If closed=true, the day is closed.",
    parameters: {
      type: "object",
      properties: {
        day_of_week: { type: "integer" },
        open_time: { type: "string" },
        close_time: { type: "string" },
        closed: { type: "boolean" },
      },
      required: ["day_of_week"],
    },
  },
  {
    name: "list_time_off",
    description:
      "List time-off rows. Pass barber_id to filter (omit for shop-wide too).",
    parameters: {
      type: "object",
      properties: { barber_id: { type: "string" } },
    },
  },
  {
    name: "create_time_off",
    description:
      "Create a time-off block. Omit barber_id for shop-wide. Times in ISO 8601.",
    parameters: {
      type: "object",
      properties: {
        barber_id: { type: "string" },
        starts_at: { type: "string" },
        ends_at: { type: "string" },
        reason: { type: "string" },
      },
      required: ["starts_at", "ends_at"],
    },
  },
  {
    name: "delete_time_off",
    description: "Delete a time-off row by UUID.",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "list_gallery_photos",
    description: "List gallery photos.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "delete_gallery_photo",
    description: "Delete a gallery photo by id and storage_path.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        storage_path: { type: "string" },
      },
      required: ["id", "storage_path"],
    },
  },
  {
    name: "web_search",
    description:
      "Search the public web. Use for trend questions (e.g. trending haircuts/hairstyles), local market info, or any fact not in the shop's database. Returns the top 5 results with title, url, and snippet.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query in plain English.",
        },
      },
      required: ["query"],
    },
  },
];
