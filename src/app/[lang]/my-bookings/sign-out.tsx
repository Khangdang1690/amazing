"use client";

import { signOutMyBookingsAction } from "@/app/actions/booking";

export function SignOutButton({ label }: { label: string }) {
  return (
    <form action={signOutMyBookingsAction}>
      <button
        type="submit"
        className="text-sm text-muted-foreground hover:text-foreground hover:underline"
      >
        {label}
      </button>
    </form>
  );
}
