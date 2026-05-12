"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  requestOtpAction,
  verifyOtpAction,
} from "@/app/actions/booking";

type Messages = {
  phoneLabel: string;
  phonePlaceholder: string;
  sending: string;
  sendCode: string;
  codeHint: string;
  codeLabel: string;
  codePlaceholder: string;
  verifying: string;
  verifyAndContinue: string;
  useDifferentNumber: string;
};

export function OtpForm({ messages }: { messages: Messages }) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");

  const [reqState, requestFormAction, reqPending] = useActionState(
    async (prev: { ok: boolean; error?: string } | null, fd: FormData) => {
      const phoneInput = (fd.get("phone") as string | null) ?? "";
      const result = await requestOtpAction(null, fd);
      if (result.ok) {
        setPhone(phoneInput);
        setStep("code");
      }
      return result.ok
        ? { ok: true }
        : { ok: false, error: result.error };
    },
    null,
  );

  const [verifyState, verifyFormAction, verifyPending] = useActionState(
    async (
      _prev: { ok: boolean; error?: string } | null,
      fd: FormData,
    ) => {
      const result = await verifyOtpAction(null, fd);
      if (result.ok) {
        // Force a page reload so the cookie is picked up by the server component
        window.location.reload();
        return { ok: true };
      }
      return { ok: false, error: result.error };
    },
    null,
  );

  if (step === "phone") {
    return (
      <form action={requestFormAction} className="space-y-4">
        <div>
          <Label htmlFor="phone">{messages.phoneLabel}</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            required
            autoComplete="tel"
            placeholder={messages.phonePlaceholder}
          />
        </div>
        {reqState && !reqState.ok && reqState.error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {reqState.error}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          className="h-11 w-full text-base"
          disabled={reqPending}
        >
          {reqPending ? messages.sending : messages.sendCode}
        </Button>
      </form>
    );
  }

  return (
    <form action={verifyFormAction} className="space-y-4">
      <input type="hidden" name="phone" value={phone} />
      <p className="text-sm text-muted-foreground">{messages.codeHint}</p>
      <div>
        <Label htmlFor="code">{messages.codeLabel}</Label>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          maxLength={6}
          placeholder={messages.codePlaceholder}
        />
      </div>
      {verifyState && !verifyState.ok && verifyState.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {verifyState.error}
        </p>
      )}
      <Button
        type="submit"
        size="lg"
        className="h-11 w-full text-base"
        disabled={verifyPending}
      >
        {verifyPending ? messages.verifying : messages.verifyAndContinue}
      </Button>
      <button
        type="button"
        onClick={() => setStep("phone")}
        className="block w-full text-center text-sm text-muted-foreground hover:underline"
      >
        {messages.useDifferentNumber}
      </button>
    </form>
  );
}
