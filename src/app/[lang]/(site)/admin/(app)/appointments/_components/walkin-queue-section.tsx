import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  flattenAppointmentServices,
  getActiveServices,
} from "@/lib/queries";
import { formatPhone } from "@/lib/phone";
import { formatInTimeZone } from "date-fns-tz";
import { env } from "@/lib/env";
import { AddWalkinDialog } from "./add-walkin-dialog";
import { MarkServedButton } from "./mark-served-button";
import { ServeScheduledDialog } from "./serve-scheduled-dialog";

function waitedFromCreatedLabel(createdAtISO: string): string {
  const ms = Date.now() - new Date(createdAtISO).getTime();
  const mins = Math.max(0, Math.floor(ms / 60000));
  if (mins < 60) return `Waiting ${mins}m`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `Waiting ${hours}h` : `Waiting ${hours}h ${rem}m`;
}

function lateScheduledLabel(startsAtISO: string): string {
  return `Late · scheduled ${formatInTimeZone(new Date(startsAtISO), env.shopTimezone, "h:mm a")}`;
}

type RawAppt = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  status: string;
  starts_at: string;
  created_at: string;
  notes: string | null;
  barbers: { id: string; name: string } | { id: string; name: string }[] | null;
  appointment_services:
    | Array<{ position: number; services: { id: string; name: string } | { id: string; name: string }[] | null }>
    | null;
};

export async function WalkinQueueSection() {
  const supabase = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  // Two reads merged in JS: cleaner than wrestling with PostgREST `.or()`
  // syntax for combined and-clauses.
  const [walkinsRes, lateRes, barbersRes, services] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        `id, customer_name, customer_phone, status, starts_at, created_at, notes,
         barbers ( id, name ),
         appointment_services ( position, services ( id, name ) )`,
      )
      .eq("status", "walkin")
      .order("created_at", { ascending: true }),
    supabase
      .from("appointments")
      .select(
        `id, customer_name, customer_phone, status, starts_at, created_at, notes,
         barbers ( id, name ),
         appointment_services ( position, services ( id, name ) )`,
      )
      .eq("status", "confirmed")
      .is("ends_at", null)
      .lte("starts_at", nowIso)
      .order("starts_at", { ascending: true }),
    supabase
      .from("barbers")
      .select("id, name")
      .eq("active", true)
      .order("display_order"),
    getActiveServices(),
  ]);

  const walkins = (walkinsRes.data ?? []) as RawAppt[];
  const late = (lateRes.data ?? []) as RawAppt[];

  // Order the merged queue by scheduled start time first (late scheduled
  // bookings have priority because they committed to a time), then walk-ins
  // by their arrival time.
  const merged = [...late, ...walkins].map((a) => ({
    id: a.id,
    customer_name: a.customer_name,
    customer_phone: a.customer_phone ?? null,
    status: a.status,
    starts_at: a.starts_at,
    created_at: a.created_at,
    notes: a.notes,
    barber: Array.isArray(a.barbers) ? a.barbers[0] : a.barbers,
    services: flattenAppointmentServices(a.appointment_services),
  }));

  const serviceOptions = services.map((s) => ({
    id: s.id,
    name: s.name,
    duration_minutes: s.duration_minutes,
    price_cents: s.price_cents,
  }));

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Queue</h2>
          <p className="text-sm text-muted-foreground">
            {merged.length === 0
              ? "No one waiting. Walk-ins and past-due scheduled bookings show up here."
              : `${merged.length} waiting · scheduled first, then walk-ins`}
          </p>
        </div>
        <AddWalkinDialog
          barbers={barbersRes.data ?? []}
          services={serviceOptions}
        />
      </div>

      {merged.length > 0 && (
        <div className="space-y-2">
          {merged.map((w) => {
            const isWalkin = w.status === "walkin";
            return (
              <Card key={w.id} className="p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 text-sm">
                      <Badge variant={isWalkin ? "secondary" : "destructive"}>
                        {isWalkin
                          ? waitedFromCreatedLabel(w.created_at)
                          : lateScheduledLabel(w.starts_at)}
                      </Badge>
                    </div>
                    <div className="mt-0.5 text-sm">
                      <span className="font-medium">{w.customer_name}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        ·{" "}
                        {w.services.length > 0
                          ? w.services.map((s) => s.name).join(", ")
                          : "Services TBD"}
                        {w.barber?.name ? ` with ${w.barber.name}` : ""}
                      </span>
                    </div>
                    {w.customer_phone && (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        <a
                          href={`tel:${w.customer_phone}`}
                          className="hover:text-foreground"
                        >
                          {formatPhone(w.customer_phone)}
                        </a>
                      </div>
                    )}
                    {w.notes && (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {w.notes}
                      </div>
                    )}
                  </div>
                  {isWalkin ? (
                    <MarkServedButton appointmentId={w.id} />
                  ) : (
                    <ServeScheduledDialog
                      appointmentId={w.id}
                      services={serviceOptions}
                    />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
