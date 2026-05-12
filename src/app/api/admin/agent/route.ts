import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env, SHOP } from "@/lib/env";
import {
  FUNCTION_DECLARATIONS,
  runTool,
  type ToolResult,
} from "@/lib/agent/tools";

export const runtime = "nodejs";

type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content?: string | null;
      tool_calls?: ToolCall[];
    }
  | { role: "tool"; tool_call_id: string; content: string };

type ToolCallDelta = {
  index: number;
  id?: string;
  type?: "function";
  function?: { name?: string; arguments?: string };
};

type GroqStreamChunk = {
  choices?: Array<{
    delta?: {
      role?: string;
      content?: string | null;
      tool_calls?: ToolCallDelta[];
    };
    finish_reason?: string | null;
  }>;
  error?: { message?: string };
};

const MODEL = env.groqModel || "llama-3.3-70b-versatile";
const MAX_TOOL_TURNS = 8;
const DEV = process.env.NODE_ENV === "development";

function systemInstructionText(): string {
  const now = new Date();
  return [
    `You are the admin agent for ${SHOP.name}, a barbershop.`,
    `You assist the shop owner with operational tasks via Supabase tools.`,
    `Current UTC time: ${now.toISOString()}. Shop timezone: ${SHOP.timezone}.`,
    ``,
    `Guidelines:`,
    `- Use tools whenever the user asks about real data (don't guess).`,
    `- Mutations are irreversible. For destructive actions (delete_*, update_appointment_status to cancelled/no_show, delete_gallery_photo), confirm the target with the user first if it wasn't already specified by id in this turn.`,
    `- Times stored in DB are UTC. When the user gives a wall-clock time, interpret it in ${SHOP.timezone} and convert to ISO 8601 with the correct offset before calling tools.`,
    `- day_of_week: 0 = Sunday, 6 = Saturday.`,
    `- Prices are in cents (price_cents). 1500 = $15.00.`,
    `- Be concise. Show counts and key fields; don't dump entire rows unless asked.`,
  ].join("\n");
}

export async function POST(req: NextRequest) {
  if (!env.groqApiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (
    env.allowedAdminEmails.length > 0 &&
    !env.allowedAdminEmails.includes(user.email.toLowerCase())
  ) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let body: { message?: string; history?: ChatMessage[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Bad JSON." }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "Empty message." }, { status: 400 });
  }
  const history: ChatMessage[] = Array.isArray(body.history) ? body.history : [];

  const messages: ChatMessage[] = [
    { role: "system", content: systemInstructionText() },
    ...history,
    { role: "user", content: message },
  ];

  const tools = FUNCTION_DECLARATIONS.map((fn) => ({
    type: "function" as const,
    function: fn,
  }));

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (obj: unknown) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(obj)}\n\n`),
        );
      };
      const finish = () => {
        if (closed) return;
        closed = true;
        controller.close();
      };

      try {
        let endedWithoutToolCalls = false;

        for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
          const res = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "content-type": "application/json",
                authorization: `Bearer ${env.groqApiKey}`,
              },
              body: JSON.stringify({
                model: MODEL,
                stream: true,
                tool_choice: "auto",
                messages,
                tools,
              }),
            },
          );

          if (!res.ok || !res.body) {
            const raw = await res.text().catch(() => "");
            let msg = `Groq API ${res.status}`;
            try {
              const parsed = JSON.parse(raw) as {
                error?: { message?: string };
              };
              if (parsed?.error?.message) msg = parsed.error.message;
            } catch {
              if (raw) msg = raw.slice(0, 500);
            }
            if (DEV) {
              console.error(
                `[agent:sse] HTTP ${res.status} on turn ${turn}:`,
                raw.slice(0, 1000),
              );
            }
            send({ type: "error", message: msg });
            finish();
            return;
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";

          let assistantText = "";
          const toolCallsByIndex = new Map<number, ToolCall>();
          let lastFinishReason: string | null | undefined;
          let eventCount = 0;
          let streamError: string | undefined;

          const handlePayload = (payload: string) => {
            if (!payload || payload === "[DONE]") return;
            if (DEV) console.log("[agent:sse]", payload.slice(0, 500));

            let event: GroqStreamChunk;
            try {
              event = JSON.parse(payload);
            } catch {
              if (DEV) console.warn("[agent:sse] non-JSON payload:", payload);
              return;
            }
            eventCount += 1;

            if (event.error?.message) {
              streamError = event.error.message;
              return;
            }

            const choice = event.choices?.[0];
            if (!choice) return;
            if (choice.finish_reason !== undefined) {
              lastFinishReason = choice.finish_reason;
            }

            const delta = choice.delta;
            if (!delta) return;

            if (typeof delta.content === "string" && delta.content.length > 0) {
              assistantText += delta.content;
              send({ type: "text", delta: delta.content });
            }

            if (Array.isArray(delta.tool_calls)) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index;
                let acc = toolCallsByIndex.get(idx);
                if (!acc) {
                  acc = {
                    id: tc.id ?? "",
                    type: "function",
                    function: { name: "", arguments: "" },
                  };
                  toolCallsByIndex.set(idx, acc);
                }
                if (tc.id && !acc.id) acc.id = tc.id;
                if (tc.function?.name && !acc.function.name) {
                  acc.function.name = tc.function.name;
                }
                if (typeof tc.function?.arguments === "string") {
                  acc.function.arguments += tc.function.arguments;
                }
              }
            }
          };

          const handleBlock = (block: string) => {
            for (const rawLine of block.split("\n")) {
              const line = rawLine.trimEnd();
              if (!line.startsWith("data:")) continue;
              handlePayload(line.slice(5).trim());
            }
          };

          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });

            let sepIdx: number;
            while ((sepIdx = buf.indexOf("\n\n")) !== -1) {
              const block = buf.slice(0, sepIdx);
              buf = buf.slice(sepIdx + 2);
              handleBlock(block);
            }
          }
          buf += decoder.decode();
          if (buf.trim().length > 0) {
            handleBlock(buf);
          }

          if (streamError) {
            if (DEV) {
              console.error(
                `[agent:sse] stream error on turn ${turn}: ${streamError}`,
              );
            }
            send({ type: "error", message: streamError });
            finish();
            return;
          }

          const accumulatedCalls = [...toolCallsByIndex.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([, v]) => v)
            .filter((c) => c.function.name.length > 0);

          if (eventCount === 0 || (!assistantText && accumulatedCalls.length === 0)) {
            const msg =
              eventCount === 0
                ? `Groq returned 0 chunks on turn ${turn}. Check GROQ_MODEL ("${MODEL}") and GROQ_API_KEY.`
                : `Groq stream produced ${eventCount} chunk(s) but no content or tool calls. finish_reason=${lastFinishReason ?? "none"}.`;
            if (DEV) console.error(`[agent:sse] empty-stream: ${msg}`);
            send({ type: "error", message: msg });
            finish();
            return;
          }

          if (accumulatedCalls.length === 0) {
            messages.push({
              role: "assistant",
              content: assistantText,
            });
            endedWithoutToolCalls = true;
            break;
          }

          messages.push({
            role: "assistant",
            content: assistantText.length > 0 ? assistantText : null,
            tool_calls: accumulatedCalls,
          });

          for (const call of accumulatedCalls) {
            let args: Record<string, unknown> = {};
            try {
              args = call.function.arguments
                ? (JSON.parse(call.function.arguments) as Record<string, unknown>)
                : {};
            } catch (e) {
              if (DEV) {
                console.warn(
                  `[agent:sse] tool args JSON parse failed for ${call.function.name}:`,
                  call.function.arguments,
                  e,
                );
              }
            }

            send({
              type: "tool_call",
              name: call.function.name,
              args,
            });

            const result: ToolResult = await runTool(call.function.name, args);

            send({
              type: "tool_result",
              name: call.function.name,
              ok: result.ok,
              summary: result.summary,
            });

            const payload = result.ok
              ? { ok: true, data: result.data ?? null, summary: result.summary }
              : { ok: false, error: result.error, summary: result.summary };

            messages.push({
              role: "tool",
              tool_call_id: call.id,
              content: JSON.stringify(payload),
            });
          }
        }

        if (!endedWithoutToolCalls) {
          send({
            type: "text",
            delta:
              "\n\n(I hit the tool-call limit without a final answer. Try a more specific request.)",
          });
        }

        const historyOut = messages.filter((m) => m.role !== "system");
        send({ type: "done", history: historyOut });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Stream failed.";
        if (DEV) console.error("[agent:sse] threw:", e);
        send({ type: "error", message: msg });
      } finally {
        finish();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
