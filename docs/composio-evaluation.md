# Notes from a day building with Composio

I spent ~6 hours wiring two Composio toolkits (Google Calendar + Google Sheets)
into an existing Next.js + Groq admin agent. Both tools work end-to-end.
Branch: [`feat/composio-spike`](../).

This is what I want to walk through.

---

## What I built

- **Host project**: a real barbershop admin agent. Next.js 16, Supabase, Groq
  GPT-OSS 120B. 18 existing tools backed by Supabase. Custom SSE streaming
  loop in [`route.ts`](../src/app/api/admin/agent/route.ts) — **not** using
  `@composio/openai` or any framework adapter.
- **What I added**: two Composio-backed tools wired into the existing
  registry — `composio_gcal_create_event` and `composio_sheets_append_row`.
- **End result**: natural-language prompts in the admin chat now create
  calendar events and append rows to a Google Sheet.

Files: [`composio-tools.ts`](../src/lib/agent/composio-tools.ts) (handlers),
[`tools.ts`](../src/lib/agent/tools.ts) (registry),
[`composio-bootstrap.ts`](../scripts/composio-bootstrap.ts) (OAuth init).

---

## The thing I kept thinking about

Your homepage says *"Your agent decides what to do. We handle the rest."* —
**tool-calling infrastructure**.

The pre-task I worked through was about building a **dependency graph of
tools** so an agent knows what to call before the tool it actually wants.
That's not infrastructure. That's agent reasoning.

My read: Composio is moving up the stack toward agent reasoning, but framing
it as "smarter infrastructure" because the agent-platform space is crowded.
The Series A title — *"$29M to build **skills** that evolve with your
agents"* — hints at the same shift.

Is that read correct?

---

## Two things I want to ask about

### 1. The SDK still ships a method the server retired

I followed the public [Authenticating Tools](https://docs.composio.dev/docs/tools-direct/authenticating-tools)
docs literally and called `composio.connectedAccounts.initiate(userId, authConfigId)`.
It threw HTTP 400:

```
ComposioLegacyConnectedAccountsEndpointRetiredError
"Creating connections on this endpoint for Composio-managed OAuth auth
configs is no longer supported. Use POST /api/v3/connected_accounts/link
instead."
```

The endpoint was retired on **2026-04-24**. `@composio/core@0.9.1` still
exports `initiate()` as the primary method. The docs still show it.

**Credit where it's due** — the error's `possibleFixes` field told me to use
`connectedAccounts.link()`. Same signature. Same return shape. I changed one
method name and everything kept working. **Best deprecation handoff I've
ever seen in an SDK error.**

**The question**: could the SDK *alias* deprecated methods to their
replacements with a `console.warn` instead of throwing? That's how Stripe,
AWS, every mature SDK handles migrations. The recovery here is excellent —
it's the initial collision that shouldn't be happening.

### 2. `dangerouslySkipVersionCheck` is the default-required path

My very first `tools.execute()` call threw:

```
ComposioToolVersionRequiredError:
Tool version resolves to "latest" but dangerouslySkipVersionCheck is false.
```

The [Quickstart](https://docs.composio.dev/docs/quickstart) doesn't mention
either pinning a version or this flag. I found it in JSDoc inside
`node_modules/@composio/core/dist/composio-*.d.mts`.

To move forward you have to do one of two things:

```ts
// Option A — pin a version (but nobody tells you which)
{ version: "20250909_00", userId, arguments }

// Option B — accept the "dangerous" flag
{ dangerouslySkipVersionCheck: true, userId, arguments }
```

I went with B. Every shipping integrator in a hurry will go with B. Which
means almost everyone using Composio in production has
`dangerouslySkipVersionCheck: true` scattered across their codebase — and the
word "dangerously" stops meaning anything.

**The question**: could the default be *"use latest, log a warning"* instead
of *"throw"*? Or could the Quickstart show pinning, so the dangerously-named
flag stays reserved for the rare cases it's meant for?

---

## What worked beautifully

1. **Hosted OAuth.** Never opened Google Cloud Console. For a 24-hour spike,
   that's the difference between shipping and not.

2. **`waitForConnection(timeout)` + the `initiate()` → `link()` migration.**
   A polling loop turned into one line. And the migration honored "same
   signature, same return shape" *literally* — I changed one method name and
   everything kept working. That's the kind of API hygiene that signals the
   team thinks about migrations as a product surface.

3. **Error messages.** When Composio's errors are good, they're really good.
   `possibleFixes` saved me 20 minutes in Q1. The Sheets `Unable to parse
   range` error told me what was wrong, why, and showed three valid formats.
   The agent recovered without me explaining anything.

---

## What I'd ship

1. **Deprecation with warning, not deprecation by removal.** Alias
   `initiate()` to `link()` with a `console.warn`. Fixes the wall every new
   customer will hit until both the SDK and docs are updated.

2. **Sensible version-check default.** If no version is pinned, log a
   warning and use latest. Save the "dangerously" flag for actual dangerous
   cases — like pinning a version known to be deprecated.

---

I had a good time building this. The parts that worked, worked. The parts
that didn't usually had thoughtful errors pointing me to the fix. The notes
above are from the position of *"I'd consider betting a product on this, and
here are the seams I noticed while leaning on it"* — not "please don't hire
me."
