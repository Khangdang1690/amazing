"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { ArrowLeft, Send, Wrench, Loader2Icon } from "lucide-react";
import { Streamdown } from "streamdown";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CalendarStatusPill } from "./calendar-status-pill";
import type { CalendarConnectionStatus } from "@/app/actions/composio";

type Role = "user" | "model";

type ToolCallTrace = {
  name: string;
  args: Record<string, unknown>;
  status: "running" | "ok" | "error";
  summary: string;
};

type ChatMessage = {
  role: Role;
  text: string;
  toolCalls: ToolCallTrace[];
};

type HistoryContent = Record<string, unknown>;

const SUGGESTIONS = [
  "How many appointments do we have today?",
  "List all active barbers.",
  "Mark appointment <id> as completed.",
  "Add a 'Beard Trim' service for $15, 20 minutes.",
];

export function AgentChat({
  adminEmail,
  backHref,
  hasApiKey,
  initialCalendarStatus,
}: {
  adminEmail: string;
  backHref: string;
  hasApiKey: boolean;
  initialCalendarStatus: CalendarConnectionStatus;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<HistoryContent[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  function updateLastAssistant(
    updater: (prev: ChatMessage) => ChatMessage,
  ) {
    setMessages((ms) => {
      if (ms.length === 0) return ms;
      const next = [...ms];
      const last = next[next.length - 1];
      if (last.role !== "model") return ms;
      next[next.length - 1] = updater(last);
      return next;
    });
  }

  async function send(prompt?: string) {
    const text = (prompt ?? input).trim();
    if (!text || busy || !hasApiKey) return;
    setErr(null);
    setInput("");
    setMessages((m) => [
      ...m,
      { role: "user", text, toolCalls: [] },
      { role: "model", text: "", toolCalls: [] },
    ]);
    setBusy(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/admin/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, history }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        const raw = await res.text().catch(() => "");
        let msg = `Request failed with ${res.status}`;
        try {
          const parsed = JSON.parse(raw) as { error?: string };
          if (parsed?.error) msg = parsed.error;
        } catch {
          if (raw) msg = raw.slice(0, 500);
        }
        throw new Error(msg);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let sepIdx: number;
        while ((sepIdx = buf.indexOf("\n\n")) !== -1) {
          const block = buf.slice(0, sepIdx);
          buf = buf.slice(sepIdx + 2);

          for (const rawLine of block.split("\n")) {
            const line = rawLine.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            let event: {
              type?: string;
              delta?: string;
              name?: string;
              args?: Record<string, unknown>;
              ok?: boolean;
              summary?: string;
              message?: string;
              history?: HistoryContent[];
            };
            try {
              event = JSON.parse(payload);
            } catch {
              continue;
            }

            if (event.type === "text" && typeof event.delta === "string") {
              const delta = event.delta;
              updateLastAssistant((prev) => ({
                ...prev,
                text: prev.text + delta,
              }));
            } else if (event.type === "tool_call" && event.name) {
              const call: ToolCallTrace = {
                name: event.name,
                args: event.args ?? {},
                status: "running",
                summary: "Running…",
              };
              updateLastAssistant((prev) => ({
                ...prev,
                toolCalls: [...prev.toolCalls, call],
              }));
            } else if (event.type === "tool_result" && event.name) {
              const name = event.name;
              const ok = !!event.ok;
              const summary = event.summary ?? "";
              updateLastAssistant((prev) => {
                const calls = [...prev.toolCalls];
                for (let i = calls.length - 1; i >= 0; i--) {
                  if (calls[i].name === name && calls[i].status === "running") {
                    calls[i] = {
                      ...calls[i],
                      status: ok ? "ok" : "error",
                      summary,
                    };
                    break;
                  }
                }
                return { ...prev, toolCalls: calls };
              });
            } else if (event.type === "done" && Array.isArray(event.history)) {
              setHistory(event.history);
            } else if (event.type === "error" && event.message) {
              throw new Error(event.message);
            }
          }
        }
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // user cancelled — already trimmed in stop()
      } else {
        setErr(e instanceof Error ? e.message : "Something went wrong.");
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function reset() {
    abortRef.current?.abort();
    setMessages([]);
    setHistory([]);
    setErr(null);
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to admin
          </Link>
          <div className="hidden h-5 w-px bg-border md:block" />
          <div className="hidden md:block">
            <h1 className="text-sm font-semibold tracking-tight">Admin Agent</h1>
            <p className="text-xs text-muted-foreground">
              GPT-OSS 120B · Groq · streaming
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground md:inline">
            {adminEmail}
          </span>
          <CalendarStatusPill initialStatus={initialCalendarStatus} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={reset}
            disabled={busy || messages.length === 0}
          >
            New chat
          </Button>
        </div>
      </header>

      {!hasApiKey && (
        <div className="border-b bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          GROQ_API_KEY is not set. Add it to your env file to enable the agent.
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {messages.length === 0 ? (
            <div className="space-y-6 py-10">
              <div className="text-center">
                <h2 className="text-2xl font-semibold tracking-tight">
                  What can I do for you?
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ask about bookings, barbers, services, hours, gallery, or
                  time-off. I can also make changes.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-lg border bg-card p-3 text-left text-sm hover:bg-muted"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ul className="space-y-4">
              {messages.map((m, i) => {
                const isLastAssistant =
                  i === messages.length - 1 && m.role === "model";
                const showWaiting =
                  isLastAssistant && busy && m.text.length === 0;
                return (
                  <li key={i}>
                    <Bubble message={m} waiting={showWaiting} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <footer className="border-t bg-background">
        <div className="mx-auto max-w-3xl px-4 py-3">
          {err && (
            <p className="mb-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {err}
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-end gap-2"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Message the agent…"
              rows={1}
              className="min-h-10 max-h-48 flex-1 resize-y rounded-md border bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              disabled={busy || !hasApiKey}
            />
            {busy ? (
              <Button
                type="button"
                variant="outline"
                onClick={stop}
                className="h-10"
              >
                Stop
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!input.trim() || !hasApiKey}
                className="h-10"
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Send</span>
              </Button>
            )}
          </form>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Press Enter to send · Shift+Enter for newline · The agent can modify
            real data.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Bubble({
  message,
  waiting,
}: {
  message: ChatMessage;
  waiting: boolean;
}) {
  const isUser = message.role === "user";
  const hasText = message.text.length > 0;
  const hasCalls = message.toolCalls.length > 0;

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div className="max-w-[85%] space-y-2">
        {message.toolCalls.map((t, i) => (
          <Card
            key={i}
            className="border-dashed p-2.5 text-xs text-muted-foreground"
          >
            <div className="flex items-center gap-1.5 font-mono">
              <Wrench className="h-3 w-3" />
              <span className="font-medium text-foreground">{t.name}</span>
              <span
                className={
                  t.status === "running"
                    ? "inline-flex items-center gap-1 text-amber-600"
                    : t.status === "ok"
                      ? "text-emerald-600"
                      : "text-destructive"
                }
              >
                {t.status === "running" ? (
                  <>
                    <Loader2Icon className="h-3 w-3 animate-spin" />
                    running
                  </>
                ) : (
                  t.status
                )}
              </span>
            </div>
            <pre className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-snug">
              {JSON.stringify(t.args, null, 2)}
            </pre>
            <p className="mt-1 text-[11px] italic">{t.summary}</p>
          </Card>
        ))}

        {hasText &&
          (isUser ? (
            <div className="rounded-2xl bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-primary-foreground whitespace-pre-wrap">
              {message.text}
            </div>
          ) : (
            <div className="prose-chat rounded-2xl bg-muted px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
              <Streamdown parseIncompleteMarkdown>{message.text}</Streamdown>
            </div>
          ))}

        {waiting && !hasText && (
          <div className="inline-flex items-center gap-2 rounded-2xl bg-muted px-3.5 py-2.5 text-sm italic text-muted-foreground">
            <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
            {hasCalls ? "Working…" : "Thinking…"}
          </div>
        )}
      </div>
    </div>
  );
}
