import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Barber } from "@/lib/types";
import { BarberForm } from "./barber-form";
import { DeleteBarberButton } from "./delete-barber-button";
import { getTranslationsFor } from "@/lib/queries";

export const metadata = { title: "Barbers — Admin" };

export default async function BarbersPage() {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("barbers")
    .select("*")
    .order("display_order");
  const barbers: Barber[] = data ?? [];

  const viByBarber = await Promise.all(
    barbers.map((b) => getTranslationsFor("barber", b.id, "vi")),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Barbers</h1>
        <p className="text-sm text-muted-foreground">
          Manage who&apos;s taking bookings. Inactive barbers are hidden from
          the booking flow.
        </p>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Add a barber</h2>
        <BarberForm />
      </Card>

      <div className="space-y-3">
        {barbers.map((b, i) => (
          <Card key={b.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{b.name}</h3>
                  {!b.active && <Badge variant="secondary">Hidden</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">/{b.slug}</p>
              </div>
              <DeleteBarberButton id={b.id} name={b.name} />
            </div>
            <div className="mt-4">
              <BarberForm initial={b} initialVi={{ bio: viByBarber[i].bio }} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
