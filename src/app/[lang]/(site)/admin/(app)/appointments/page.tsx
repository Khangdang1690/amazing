import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  flattenAppointmentServices,
  getActiveServices,
} from "@/lib/queries";
import { env } from "@/lib/env";
import { formatInTimeZone } from "date-fns-tz";
import { formatPhone } from "@/lib/phone";
import { AppointmentRowActions } from "../_components/appointment-row-actions";
import { WalkinQueueSection } from "./_components/walkin-queue-section";

export const metadata = { title: "Appointments — Admin" };

const PAGE_SIZE = 10;

type SearchParams = Promise<{
  status?: string;
  barber?: string;
  service?: string;
  from?: string;
  to?: string;
  page?: string;
}>;

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const supabase = createSupabaseAdminClient();

  const pageNum = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const fromIdx = (pageNum - 1) * PAGE_SIZE;
  const toIdx = fromIdx + PAGE_SIZE - 1;

  let q = supabase
    .from("appointments")
    .select(
      `id, customer_name, customer_phone, starts_at, status, notes,
       barbers ( id, name ),
       appointment_services ( position, services ( id, name ) )`,
      { count: "exact" },
    )
    .order("starts_at", { ascending: false })
    .range(fromIdx, toIdx);

  if (sp.status) {
    q = q.eq("status", sp.status);
  } else {
    // Hide in-queue walk-ins from the booking-history view by default.
    // Completed walk-ins still appear (their status flips to 'completed').
    q = q.neq("status", "walkin");
  }
  if (sp.barber) q = q.eq("barber_id", sp.barber);
  if (sp.service) {
    // Filter through the junction: find appointment IDs that include this service.
    const { data: matching } = await supabase
      .from("appointment_services")
      .select("appointment_id")
      .eq("service_id", sp.service);
    const ids = (matching ?? []).map((r) => r.appointment_id as string);
    q = q.in("id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }
  if (sp.from) q = q.gte("starts_at", sp.from);
  if (sp.to) q = q.lte("starts_at", sp.to);

  const [{ data: appts, count }, { data: barbers }, services] =
    await Promise.all([
      q,
      supabase.from("barbers").select("id, name").order("display_order"),
      getActiveServices(),
    ]);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const nowMs = new Date().getTime();
  const list = (appts ?? []).map((a) => {
    const starts_at = a.starts_at as string;
    const status = a.status as
      | "confirmed"
      | "completed"
      | "cancelled"
      | "no_show"
      | "walkin";
    return {
      id: a.id as string,
      customer_name: a.customer_name as string,
      customer_phone: (a.customer_phone as string | null) ?? null,
      starts_at,
      status,
      notes: a.notes as string | null,
      barber: Array.isArray(a.barbers) ? a.barbers[0] : a.barbers,
      services: flattenAppointmentServices(a.appointment_services),
      isLate:
        status === "confirmed" && new Date(starts_at).getTime() <= nowMs,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Appointments</h1>
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? "No bookings match these filters."
            : `Showing ${fromIdx + 1}–${Math.min(fromIdx + PAGE_SIZE, total)} of ${total}. Use filters below.`}
        </p>
      </div>

      <WalkinQueueSection />

      <form className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3">
        <div>
          <label className="text-xs font-medium uppercase text-muted-foreground">
            Status
          </label>
          <select
            name="status"
            defaultValue={sp.status ?? ""}
            className="mt-1 block h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">All (excl. walk-in queue)</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No-show</option>
            <option value="walkin">Walk-in (in queue)</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium uppercase text-muted-foreground">
            Barber
          </label>
          <select
            name="barber"
            defaultValue={sp.barber ?? ""}
            className="mt-1 block h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">All</option>
            {(barbers ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium uppercase text-muted-foreground">
            Service
          </label>
          <select
            name="service"
            defaultValue={sp.service ?? ""}
            className="mt-1 block h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">All</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium uppercase text-muted-foreground">
            From
          </label>
          <input
            name="from"
            type="date"
            defaultValue={sp.from ?? ""}
            className="mt-1 block h-9 rounded-md border bg-background px-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium uppercase text-muted-foreground">
            To
          </label>
          <input
            name="to"
            type="date"
            defaultValue={sp.to ?? ""}
            className="mt-1 block h-9 rounded-md border bg-background px-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Apply
        </button>
      </form>

      {list.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          No appointments match these filters.
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((a) => (
            <Card key={a.id} className="p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-mono">
                      {formatInTimeZone(
                        new Date(a.starts_at),
                        env.shopTimezone,
                        "EEE MMM d · h:mm a",
                      )}
                    </span>
                    <Badge
                      variant={
                        a.status === "completed"
                          ? "secondary"
                          : a.status === "cancelled" || a.status === "no_show"
                            ? "destructive"
                            : "default"
                      }
                    >
                      {a.status === "no_show"
                        ? "No-show"
                        : a.status === "walkin"
                          ? "Walk-in"
                          : a.status.charAt(0).toUpperCase() +
                            a.status.slice(1)}
                    </Badge>
                    {a.isLate && (
                      <Badge variant="destructive">Running late</Badge>
                    )}
                  </div>
                  <div className="mt-0.5 text-sm">
                    <span className="font-medium">{a.customer_name}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      ·{" "}
                      {a.services.length === 0
                        ? "(no services yet)"
                        : a.services.map((s) => s.name).join(", ")}
                      {a.barber?.name ? ` with ${a.barber.name}` : ""}
                    </span>
                  </div>
                  {a.customer_phone && (
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      <a
                        href={`tel:${a.customer_phone}`}
                        className="hover:text-foreground"
                      >
                        {formatPhone(a.customer_phone)}
                      </a>
                    </div>
                  )}
                </div>
                <AppointmentRowActions
                  appointmentId={a.id}
                  currentStatus={a.status}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      {total > PAGE_SIZE && (
        <nav className="flex items-center justify-between gap-3 pt-2 text-sm">
          <span className="text-muted-foreground">
            Page {pageNum} of {totalPages}
          </span>
          <div className="flex gap-2">
            <PageLink sp={sp} page={pageNum - 1} disabled={pageNum <= 1}>
              ← Previous
            </PageLink>
            <PageLink
              sp={sp}
              page={pageNum + 1}
              disabled={pageNum >= totalPages}
            >
              Next →
            </PageLink>
          </div>
        </nav>
      )}
    </div>
  );
}

function PageLink({
  sp,
  page,
  disabled,
  children,
}: {
  sp: Awaited<SearchParams>;
  page: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="inline-flex h-9 items-center rounded-md border px-3 text-muted-foreground opacity-50">
        {children}
      </span>
    );
  }
  const qs = new URLSearchParams();
  if (sp.status) qs.set("status", sp.status);
  if (sp.barber) qs.set("barber", sp.barber);
  if (sp.service) qs.set("service", sp.service);
  if (sp.from) qs.set("from", sp.from);
  if (sp.to) qs.set("to", sp.to);
  qs.set("page", String(page));
  return (
    <a
      href={`?${qs.toString()}`}
      className="inline-flex h-9 items-center rounded-md border bg-background px-3 hover:bg-accent"
    >
      {children}
    </a>
  );
}
