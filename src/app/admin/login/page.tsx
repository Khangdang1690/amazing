import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata = { title: "Admin sign in" };

type SearchParams = Promise<{ next?: string; error?: string }>;

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/admin");

  const { next, error } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Admin sign in</h1>
      <p className="mt-2 text-muted-foreground">
        Restricted area — for shop staff only.
      </p>
      {error === "not_allowed" && (
        <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          That account isn&apos;t on the admin allowlist.
        </p>
      )}
      <Card className="mt-6 p-6">
        <LoginForm next={next ?? "/admin"} />
      </Card>
    </div>
  );
}
