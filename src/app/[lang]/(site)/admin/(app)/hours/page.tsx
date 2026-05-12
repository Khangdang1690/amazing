import { Card } from "@/components/ui/card";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ShopHours, TimeOff, Barber } from "@/lib/types";
import { HoursForm } from "./hours-form";
import { TimeOffForm } from "./time-off-form";
import { DeleteTimeOffButton } from "./delete-time-off-button";
import { formatDateTimeLabel } from "@/lib/availability";

export const metadata = { title: "Hours — Admin" };

export default async function HoursPage() {
  const supabase = createSupabaseAdminClient();
  const [{ data: hours }, { data: timeOff }, { data: barbers }] =
    await Promise.all([
      supabase.from("shop_hours").select("*").order("day_of_week"),
      supabase.from("time_off").select("*").order("starts_at"),
      supabase.from("barbers").select("id, name").order("display_order"),
    ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hours &amp; time off
        </h1>
        <p className="text-sm text-muted-foreground">
          Set weekly hours and block off one-time closures.
        </p>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Weekly hours</h2>
        <HoursForm hours={(hours ?? []) as ShopHours[]} />
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Add time off</h2>
        <TimeOffForm barbers={(barbers ?? []) as Pick<Barber, "id" | "name">[]} />
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Upcoming time off</h2>
        {!timeOff || timeOff.length === 0 ? (
          <p className="text-sm text-muted-foreground">None scheduled.</p>
        ) : (
          <ul className="divide-y">
            {(timeOff as TimeOff[]).map((t) => {
              const barberName = barbers?.find((b) => b.id === t.barber_id)?.name;
              return (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                >
                  <div>
                    <div className="font-medium">
                      {formatDateTimeLabel(t.starts_at)} →{" "}
                      {formatDateTimeLabel(t.ends_at)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t.barber_id
                        ? `${barberName ?? "Unknown"} only`
                        : "Whole shop"}
                      {t.reason && ` · ${t.reason}`}
                    </div>
                  </div>
                  <DeleteTimeOffButton id={t.id} />
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
