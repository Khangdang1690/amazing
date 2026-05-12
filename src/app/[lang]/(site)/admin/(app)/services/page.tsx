import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Service } from "@/lib/types";
import { ServiceForm } from "./service-form";
import { DeleteServiceButton } from "./delete-service-button";
import { formatPriceCents, formatDurationMinutes } from "@/lib/utils";
import { getTranslationsFor } from "@/lib/queries";

export const metadata = { title: "Services — Admin" };

export default async function ServicesAdminPage() {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("services")
    .select("*")
    .order("display_order");
  const services: Service[] = data ?? [];

  const viByService = await Promise.all(
    services.map((s) => getTranslationsFor("service", s.id, "vi")),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
        <p className="text-sm text-muted-foreground">
          Edit pricing and durations. New services are linked to all active
          barbers automatically.
        </p>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Add a service</h2>
        <ServiceForm />
      </Card>

      <div className="space-y-3">
        {services.map((s, i) => (
          <Card key={s.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{s.name}</h3>
                  {!s.active && <Badge variant="secondary">Hidden</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatPriceCents(s.price_cents)} ·{" "}
                  {formatDurationMinutes(s.duration_minutes)}
                </p>
              </div>
              <DeleteServiceButton id={s.id} name={s.name} />
            </div>
            <div className="mt-4">
              <ServiceForm
                initial={s}
                initialVi={{
                  name: viByService[i].name,
                  description: viByService[i].description,
                }}
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
