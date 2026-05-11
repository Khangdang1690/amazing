"use client";

import { signOutMyBookingsAction } from "@/app/actions/booking";

export function SignOutButton() {
  return (
    <form action={signOutMyBookingsAction}>
      <button
        type="submit"
        className="text-sm text-muted-foreground hover:text-foreground hover:underline"
      >
        Sign out
      </button>
    </form>
  );
}
