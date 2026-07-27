"use client";

import { useActionState, useState } from "react";
import { sendOtp, verifyOtp } from "./actions";

interface ActionState {
  error?: string;
  success?: boolean;
}

const initialState: ActionState = {};

export default function LoginPage() {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");

  const [sendState, sendAction, sendPending] = useActionState(
    async (prev: ActionState, formData: FormData): Promise<ActionState> => {
      const result = await sendOtp(formData);
      if (result?.success) {
        setEmail(formData.get("email") as string);
        setStep("otp");
      }
      return result ?? prev;
    },
    initialState,
  );

  const [verifyState, verifyAction, verifyPending] = useActionState(
    async (prev: ActionState, formData: FormData): Promise<ActionState> => {
      const result = await verifyOtp(formData);
      return result ?? prev;
    },
    initialState,
  );

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          {step === "email" ? "Sign in to CETDIS" : "Check your email"}
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          {step === "email"
            ? "Enter your campus email to receive a one-time code."
            : `We sent a 6-digit code to ${email}.`}
        </p>

        {step === "email" ? (
          <form action={sendAction} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@university.edu"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {sendState.error && (
              <p className="text-sm text-red-600">{sendState.error}</p>
            )}
            <button
              type="submit"
              disabled={sendPending}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {sendPending ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form action={verifyAction} className="space-y-4">
            <input type="hidden" name="email" value={email} />
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1">
                One-time code
              </label>
              <input
                id="token"
                name="token"
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                placeholder="123456"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {verifyState.error && (
              <p className="text-sm text-red-600">{verifyState.error}</p>
            )}
            <button
              type="submit"
              disabled={verifyPending}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {verifyPending ? "Verifying…" : "Verify code"}
            </button>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              ← Use a different email
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
