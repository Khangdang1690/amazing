import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env, SHOP } from "@/lib/env";
import {
  FUNCTION_DECLARATIONS,
  runTool,
  type ToolResult,
} from "@/lib/agent/tools";

export const runtime = "nodejs";

type Part =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | {
      functionResponse: {
        name: string;
        response: Record<string, unknown>;
      };
    };

type Content = {
  role: "user" | "model" | "function";
  parts: Part[];
};

type GeminiStreamChunk = {
  candidates?: Array<{
    content?: { parts?: Part[] };
    finishReason?: string;
    safetyRatings?: Array<{ category?: string; probability?: string }>;
  }>;
  promptFeedback?: {
    blockReason?: string;
    blockReasonMessage?: string;
    safetyRatings?: Array<{ category?: string; probability?: string }>;
  };
};

const MODEL = env.geminiModel || "gemma-4-26b-a4b-it";
const MAX_TOOL_TURNS = 8;
const DEV = process.env.NODE_ENV === "development";

function systemInstruction(): { parts: { text: string }[] } {
  const now = new Date();
  return {
    parts: [
      {
        text: [
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
        ].join("\n"),
      },
    ],
  };
}

export async function POST(req: NextRequest) {
  if (!env.geminiApiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured." },
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

  let body: { message?: string; history?: Content[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Bad JSON." }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "Empty message." }, { status: 400 });
  }
  const history: Content[] = Array.isArray(body.history) ? body.history : [];

  const contents: Content[] = [
    ...history,
    { role: "user", parts: [{ text: message }] },
  ];

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
        let endedWithText = false;

        for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
          const url =
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}` +
            `:streamGenerateContent?alt=sse&key=${encodeURIComponent(env.geminiApiKey)}`;

          const res = await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              systemInstruction: systemInstruction(),
              contents,
              tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
            }),
          });

          if (!res.ok || !res.body) {
            const raw = await res.text().catch(() => "");
            let msg = `Gemini API ${res.status}`;
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

          const turnParts: Part[] = [];
          let textIdx = -1;
          let sawAnyPart = false;
          let eventCount = 0;
          let lastFinishReason: string | undefined;
          let lastSafetyRatings:
            | Array<{ category?: string; probability?: string }>
            | undefined;
          let blockReason: string | undefined;
          let blockReasonMessage: string | undefined;

          const handlePayload = (payload: string) => {
            if (!payload || payload === "[DONE]") return;
            if (DEV) console.log("[agent:sse]", payload.slice(0, 500));

            let event: GeminiStreamChunk;
            try {
              event = JSON.parse(payload);
            } catch {
              if (DEV) console.warn("[agent:sse] non-JSON payload:", payload);
              return;
            }
            eventCount += 1;

            if (event.promptFeedback?.blockReason) {
              blockReason = event.promptFeedback.blockReason;
              blockReasonMessage = event.promptFeedback.blockReasonMessage;
            }

            const candidate = event.candidates?.[0];
            if (candidate?.finishReason) {
              lastFinishReason = candidate.finishReason;
            }
            if (candidate?.safetyRatings) {
              lastSafetyRatings = candidate.safetyRatings;
            }

            const parts = candidate?.content?.parts;
            if (!Array.isArray(parts)) return;

            for (const p of parts) {
              const isThought = (p as { thought?: boolean }).thought === true;
              if (typeof (p as { text?: unknown }).text === "string") {
                const delta = (p as { text: string }).text;
                if (delta.length === 0) continue;
                if (isThought) continue;
                if (
                  textIdx >= 0 &&
                  "text" in (turnParts[textIdx] as Part)
                ) {
                  (turnParts[textIdx] as { text: string }).text += delta;
                } else {
                  turnParts.push({ text: delta });
                  textIdx = turnParts.length - 1;
                }
                sawAnyPart = true;
                send({ type: "text", delta });
              } else if (
                (p as { functionCall?: { name?: string } }).functionCall?.name
              ) {
                const raw = (
                  p as {
                    functionCall: {
                      name: string;
                      args?: Record<string, unknown>;
                    };
                  }
                ).functionCall;
                const fc = {
                  name: String(raw.name),
                  args: (raw.args ?? {}) as Record<string, unknown>,
                };
                turnParts.push({ functionCall: fc });
                textIdx = -1;
                sawAnyPart = true;
                send({
                  type: "tool_call",
                  name: fc.name,
                  args: fc.args,
                });
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
          // Flush any trailing event that didn't end with \n\n.
          buf += decoder.decode();
          if (buf.trim().length > 0) {
            handleBlock(buf);
          }

          if (!sawAnyPart) {
            const diag: string[] = [];
            if (blockReason) {
              diag.push(`Prompt blocked: blockReason=${blockReason}.`);
              if (blockReasonMessage) diag.push(blockReasonMessage);
            } else if (eventCount === 0) {
              diag.push(
                `Stream emitted 0 events. The model "${MODEL}" likely rejected the request — possibly because tools + streaming isn't supported on this model. Try non-streaming (\`:generateContent\`) or switch GEMINI_MODEL to a Gemini family model.`,
              );
            } else {
              diag.push(
                `Stream emitted ${eventCount} event${eventCount === 1 ? "" : "s"} but none contained content parts.`,
              );
              if (lastFinishReason) {
                diag.push(`finishReason=${lastFinishReason}.`);
              }
              if (lastSafetyRatings && lastSafetyRatings.length > 0) {
                const blocked = lastSafetyRatings.filter(
                  (r) =>
                    r.probability &&
                    !["NEGLIGIBLE", "LOW"].includes(r.probability),
                );
                if (blocked.length > 0) {
                  diag.push(
                    `safety: ${blocked
                      .map((r) => `${r.category}=${r.probability}`)
                      .join(", ")}.`,
                  );
                }
              }
            }
            const msg = diag.join(" ");
            if (DEV) {
              console.error(
                `[agent:sse] empty-parts diagnosis on turn ${turn}: ${msg}`,
              );
            }
            send({ type: "error", message: msg });
            finish();
            return;
          }

          contents.push({ role: "model", parts: turnParts });

          const fnCalls = turnParts.flatMap((p) =>
            "functionCall" in p ? [p.functionCall] : [],
          );

          if (fnCalls.length === 0) {
            endedWithText = true;
            break;
          }

          const responseParts: Part[] = [];
          for (const fc of fnCalls) {
            const result: ToolResult = await runTool(fc.name, fc.args ?? {});
            send({
              type: "tool_result",
              name: fc.name,
              ok: result.ok,
              summary: result.summary,
            });
            responseParts.push({
              functionResponse: {
                name: fc.name,
                response: result.ok
                  ? { ok: true, data: result.data ?? null, summary: result.summary }
                  : { ok: false, error: result.error, summary: result.summary },
              },
            });
          }
          contents.push({ role: "function", parts: responseParts });
        }

        if (!endedWithText) {
          send({
            type: "text",
            delta:
              "\n\n(I hit the tool-call limit without a final answer. Try a more specific request.)",
          });
        }
        send({ type: "done", history: contents });
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
