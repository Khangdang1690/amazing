"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Calendar, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getCalendarConnectionStatus,
  initiateCalendarConnection,
  disconnectCalendar,
  type CalendarConnectionStatus,
} from "@/app/actions/composio";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

type UiState =
  | { kind: "not_connected" }
  | { kind: "pending" }
  | { kind: "connected"; connectionId: string; accountEmail?: string }
  | { kind: "error"; message: string };

function statusToUi(status: CalendarConnectionStatus): UiState {
  if (status.status === "connected") {
    return {
      kind: "connected",
      connectionId: status.connectionId,
      accountEmail: status.accountEmail,
    };
  }
  return { kind: "not_connected" };
}

export function CalendarStatusPill({
  initialStatus,
}: {
  initialStatus: CalendarConnectionStatus;
}) {
  const [state, setState] = useState<UiState>(() => statusToUi(initialStatus));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollDeadlineRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollDeadlineRef.current = Date.now() + POLL_TIMEOUT_MS;
    pollTimerRef.current = setInterval(async () => {
      if (Date.now() > pollDeadlineRef.current) {
        stopPolling();
        setState({
          kind: "error",
          message: "Timed out waiting for Google sign-in. Try again?",
        });
        return;
      }
      try {
        const fresh = await getCalendarConnectionStatus();
        if (fresh.status === "connected") {
          stopPolling();
          setState(statusToUi(fresh));
        }
      } catch {
        // ignore transient errors during polling
      }
    }, POLL_INTERVAL_MS);
  }, [stopPolling]);

  async function handleConnect() {
    setState({ kind: "pending" });
    try {
      const { redirectUrl } = await initiateCalendarConnection();
      window.open(redirectUrl, "_blank", "noopener,noreferrer");
      startPolling();
    } catch (e) {
      setState({
        kind: "error",
        message: e instanceof Error ? e.message : "Failed to start sign-in.",
      });
    }
  }

  function handleCancel() {
    stopPolling();
    setState({ kind: "not_connected" });
  }

  async function handleDisconnect() {
    if (state.kind !== "connected") return;
    const connectionId = state.connectionId;
    setConfirmOpen(false);
    try {
      await disconnectCalendar(connectionId);
      setState({ kind: "not_connected" });
    } catch (e) {
      setState({
        kind: "error",
        message:
          e instanceof Error ? e.message : "Failed to disconnect calendar.",
      });
    }
  }

  // Visual states
  if (state.kind === "connected") {
    return (
      <>
        <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 md:inline-flex">
          <Calendar className="h-3 w-3" />
          <Check className="h-3 w-3" />
          <span className="font-medium">Calendar</span>
          {state.accountEmail && (
            <span className="text-emerald-700 dark:text-emerald-300">
              · {state.accountEmail}
            </span>
          )}
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="ml-1 rounded p-0.5 hover:bg-emerald-200/60 dark:hover:bg-emerald-900/40"
            title="Disconnect Google Calendar"
            aria-label="Disconnect Google Calendar"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Disconnect Google Calendar?</DialogTitle>
              <DialogDescription>
                The agent will no longer be able to read or modify your Google
                Calendar. You can reconnect anytime.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDisconnect}>
                Disconnect
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (state.kind === "pending") {
    return (
      <div className="hidden items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-50 px-2 py-0.5 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 md:inline-flex">
        <Calendar className="h-3 w-3" />
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Waiting for Google sign-in…</span>
        <button
          type="button"
          onClick={handleCancel}
          className="ml-1 rounded p-0.5 hover:bg-amber-200/60 dark:hover:bg-amber-900/40"
          title="Cancel"
          aria-label="Cancel"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <button
        type="button"
        onClick={handleConnect}
        className="hidden items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-xs text-destructive hover:bg-destructive/20 md:inline-flex"
        title={state.message}
      >
        <Calendar className="h-3 w-3" />
        <span>Calendar · retry</span>
      </button>
    );
  }

  // not_connected
  return (
    <button
      type="button"
      onClick={handleConnect}
      className="hidden items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-50 px-2 py-0.5 text-xs text-amber-900 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/60 md:inline-flex"
    >
      <Calendar className="h-3 w-3" />
      <span className="font-medium">Connect Calendar</span>
    </button>
  );
}
