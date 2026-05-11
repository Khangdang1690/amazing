import "server-only";
import { env, SHOP } from "@/lib/env";

function twilioConfigured(): boolean {
  return Boolean(
    env.twilioAccountSid && env.twilioAuthToken && env.twilioFromPhone,
  );
}

export async function sendLoginCodeSms(args: {
  to: string;
  code: string;
}) {
  const body = `Your ${SHOP.name} sign-in code: ${args.code}. Expires in 10 minutes.`;

  if (!twilioConfigured()) {
    console.warn("[sms] Twilio not configured — login code:", args.code);
    return;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${env.twilioAccountSid}/Messages.json`;
  const auth = Buffer.from(
    `${env.twilioAccountSid}:${env.twilioAuthToken}`,
  ).toString("base64");
  const form = new URLSearchParams({
    To: args.to,
    From: env.twilioFromPhone,
    Body: body,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Twilio ${res.status}: ${text}`);
  }
}
