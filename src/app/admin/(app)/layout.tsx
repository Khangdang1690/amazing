import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  LogOut,
  Calendar,
  Users,
  Tag,
  Clock,
  Image as ImageIcon,
} from "lucide-react";
import { signOutAction } from "@/app/actions/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

const nav = [
  { href: "/admin", label: "Today", icon: Calendar },
  { href: "/admin/appointments", label: "Appointments", icon: Calendar },
  { href: "/admin/barbers", label: "Barbers", icon: Users },
  { href: "/admin/services", label: "Services", icon: Tag },
  { href: "/admin/hours", label: "Hours", icon: Clock },
  { href: "/admin/gallery", label: "Gallery", icon: ImageIcon },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await cookies(); // force dynamic
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/admin/login");
  }
  if (
    env.allowedAdminEmails.length > 0 &&
    !env.allowedAdminEmails.includes(user.email.toLowerCase())
  ) {
    redirect("/admin/login?error=not_allowed");
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:grid-cols-[200px_1fr]">
      <aside className="md:sticky md:top-20 md:h-fit">
        <div className="rounded-xl border bg-card p-2">
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Admin
          </p>
          <nav className="flex flex-col">
            {nav.map((n) => {
              const Icon = n.icon;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
                >
                  <Icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <form action={signOutAction} className="border-t p-2">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
        <p className="mt-2 px-3 text-xs text-muted-foreground">
          {user.email}
        </p>
      </aside>
      <div>{children}</div>
    </div>
  );
}
