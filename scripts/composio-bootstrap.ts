/**
 * One-shot script to connect Google Calendar to a Composio userId via OAuth.
 * Run once per environment if the in-UI connect flow isn't available.
 *
 * Usage: `pnpm composio:connect`
 *
 * Required env vars (loaded from .env.local via tsx --env-file):
 *   COMPOSIO_API_KEY              - your Composio API key
 *   COMPOSIO_USER_ID              - any stable string identifying the admin
 *   COMPOSIO_GCAL_AUTH_CONFIG_ID  - from https://platform.composio.dev/auth-configs
 */
import { Composio } from "@composio/core";
import { exec } from "node:child_process";
import { platform } from "node:os";

function openBrowser(url: string): void {
  const cmd =
    platform() === "win32"
      ? `start "" "${url}"`
      : platform() === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.warn(`(Couldn't auto-open browser: ${err.message})`);
  });
}

async function main(): Promise<void> {
  const apiKey = process.env.COMPOSIO_API_KEY;
  const userId = process.env.COMPOSIO_USER_ID;
  const gcalId = process.env.COMPOSIO_GCAL_AUTH_CONFIG_ID;

  const missing: string[] = [];
  if (!apiKey) missing.push("COMPOSIO_API_KEY");
  if (!userId) missing.push("COMPOSIO_USER_ID");
  if (!gcalId) missing.push("COMPOSIO_GCAL_AUTH_CONFIG_ID");
  if (missing.length > 0) {
    console.error(`Missing env vars: ${missing.join(", ")}`);
    process.exit(1);
  }

  const composio = new Composio({ apiKey: apiKey as string });

  console.log(`\n→ Connecting Google Calendar for user "${userId}"…`);

  // Note: `initiate()` was retired server-side on 2026-04-24 for managed OAuth
  // auth configs. The replacement is `link()` with the same signature.
  // Migration: https://docs.composio.dev/docs/changelog/2026/04/24
  const request = await composio.connectedAccounts.link(
    userId as string,
    gcalId as string,
  );

  const redirectUrl = request.redirectUrl;
  if (!redirectUrl) {
    throw new Error(
      `No redirectUrl returned. The auth config may not be configured for OAuth.`,
    );
  }

  console.log(``);
  console.log(`Opening browser… If it doesn't open, paste this URL manually:`);
  console.log(`  ${redirectUrl}`);
  console.log(``);
  console.log(`Sign in to your Google account and click "Allow".`);
  console.log(`Waiting for connection to become ACTIVE (up to 5 minutes)…`);

  openBrowser(redirectUrl);

  const connected = await request.waitForConnection(300_000);
  console.log(`✓ Google Calendar connected. Connection id: ${connected.id}`);
  console.log(`\nYou can now run the admin agent.`);
}

main().catch((e) => {
  console.error("Bootstrap failed:", e);
  process.exit(1);
});
