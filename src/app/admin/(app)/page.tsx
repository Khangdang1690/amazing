import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { todayInShopTz } from "@/lib/availability";
import { fromZonedTime } from "date-fns-tz";
import { env } from "@/lib/env";
import { formatPhone } from "@/lib/phone";
import { formatInTimeZone } from "date-fns-tz";
import { AppointmentRowActions } from "./_components/appointment-row-actions";

export const metadata = { title: "Today — Admin" };

export default async function AdminTodayPage() {
  const today = todayInShopTz();
  const dayStart = fromZonedTime(`${today}T00:00:00`, env.shopTimezone);
  const dayEnd = fromZonedTime(`${today}T23:59:59.999`, env.shopTimezone);

  const supabase = createSupabaseAdminClient();
  const { data: appts } = await supabase
    .from("appointments")
    .select(
      `id, customer_name, customer_phone, customer_email, starts_at, ends_at, status, notes, internal_notes,
       barbers ( name ), services ( name )`,
    )
    .gte("starts_at", dayStart.toISOString())
    .lte("starts_at", dayEnd.toISOString())
    .order("starts_at", { ascending: true });

  const list = (appts ?? []).map((a) => ({
    id: a.id as string,
    customer_name: a.customer_name as string,
    customer_phone: a.customer_phone as string,
    customer_email: a.customer_email as string,
    starts_at: a.starts_at as string,
    status: a.status as
      | "confirmed"
      | "completed"
      | "cancelled"
      | "no_show",
    notes: a.notes as string | null,
    barber: Array.isArray(a.barbers) ? a.barbers[0] : a.barbers,
    service: Array.isArray(a.services) ? a.services[0] : a.services,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
          <p className="text-sm text-muted-foreground">
            {formatInTimeZone(new Date(), env.shopTimezone, "EEEE, MMMM d")}
          </p>
        </div>
        <Link
          href="/admin/appointments"
          className="text-sm font-medium hover:underline"
        >
          All appointments →
        </Link>
      </div>

      {list.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          No appointments today.
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-lg font-medium">
                      {formatInTimeZone(
                        new Date(a.starts_at),
                        env.shopTimezone,
                        "h:mm a",
                      )}
                    </span>
                    <StatusBadge status={a.status} />
                  </div>
                  <div className="mt-1 font-medium">{a.customer_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {a.service?.name} with {a.barber?.name}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <a
                      href={`tel:${a.customer_phone}`}
                      className="hover:text-foreground"
                    >
                      {formatPhone(a.customer_phone)}
                    </a>
                    <a
                      href={`mailto:${a.customer_email}`}
                      className="hover:text-foreground"
                    >
                      {a.customer_email}
                    </a>
                  </div>
                  {a.notes && (
                    <p className="mt-2 rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                      Note: {a.notes}
                    </p>
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
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: "confirmed" | "completed" | "cancelled" | "no_show";
}) {
  const variant =
    status === "completed"
      ? "secondary"
      : status === "cancelled" || status === "no_show"
        ? "destructive"
        : "default";
  const label =
    status === "no_show" ? "No-show" : status.charAt(0).toUpperCase() + status.slice(1);
  return <Badge variant={variant}>{label}</Badge>;
}
