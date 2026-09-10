"use client";

import { useActionState, useState } from "react";
import { sendOtp, verifyOtp } from "./actions";
import WobbleButton from "@/components/ui/wobble-button";

interface ActionState {
  error?: string;
  success?: boolean;
}

const initialState: ActionState = {};

export default function LoginForm() {
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
    <main className="min-h-screen flex flex-col items-center justify-center bg-white px-4 py-12 select-none">
      <div className="w-full max-w-md space-y-6">
        {/* Card Container */}
        <div className="rounded-3xl border border-gray-200/90 bg-white p-7 sm:p-9 shadow-xs space-y-6">
          {/* Step Badge */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 font-dingos-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              <span>
                {step === "email"
                  ? "Step 1 of 2 · Email"
                  : "Step 2 of 2 · OTP Code"}
              </span>
            </span>
          </div>

          {/* Title & Description */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 font-dingos-bold">
              {step === "email" ? "Sign In" : "Check Your Inbox"}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
              {step === "email"
                ? "Enter your university email to receive a passwordless, one-time verification code."
                : `We sent a 6-digit verification code to `}
              {step === "otp" && (
                <span className="font-bold text-gray-800 font-dingos-bold block mt-0.5 break-all">
                  {email}
                </span>
              )}
            </p>
          </div>

          {/* Form Step: Email */}
          {step === "email" ? (
            <form action={sendAction} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-bold uppercase tracking-wider text-gray-700 font-dingos-bold"
                >
                  Campus Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                      />
                    </svg>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    defaultValue={email}
                    placeholder="student@university.edu"
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 pl-10 pr-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-150 transition"
                  />
                </div>
                <p className="text-[11px] text-gray-400">
                  Passwordless authentication · Fast and secure
                </p>
              </div>

              {/* Error Notification */}
              {sendState.error && (
                <div className="rounded-2xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-700 flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-red-500 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4m0 4h.01"
                    />
                  </svg>
                  <span className="font-medium">{sendState.error}</span>
                </div>
              )}

              {/* Submit CTA */}
              <div className="pt-2">
                <WobbleButton
                  type="submit"
                  disabled={sendPending}
                  text={sendPending ? "Sending Code..." : "Continue with Email"}
                  hoverText={sendPending ? "Sending..." : "Get OTP Code ✉️"}
                  fillColor="#4f46e5"
                  hoverColor="#4338ca"
                  fontFamily="font-dingos-bold"
                  className="w-full py-3.5 text-sm text-white shadow-xs"
                  icon={
                    sendPending ? (
                      <svg
                        className="w-4 h-4 animate-spin text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <circle cx="12" cy="12" r="9" strokeWidth={2} />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 3v4"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                        />
                      </svg>
                    )
                  }
                />
              </div>
            </form>
          ) : (
            /* Form Step: OTP Code */
            <form action={verifyAction} className="space-y-4">
              <input type="hidden" name="email" value={email} />

              <div className="space-y-1.5">
                <label
                  htmlFor="token"
                  className="block text-xs font-bold uppercase tracking-wider text-gray-700 font-dingos-bold"
                >
                  Enter 6-Digit Code <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="token"
                    name="token"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    autoFocus
                    placeholder="······"
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3.5 px-4 text-center font-dingos-bold text-2xl tracking-[0.35em] text-gray-900 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-150 transition"
                  />
                </div>
                <p className="text-[11px] text-gray-400 text-center">
                  Codes expire in 10 minutes
                </p>
              </div>

              {/* Error Notification */}
              {verifyState.error && (
                <div className="rounded-2xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-700 flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-red-500 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4m0 4h.01"
                    />
                  </svg>
                  <span className="font-medium">{verifyState.error}</span>
                </div>
              )}

              {/* Submit CTA */}
              <div className="pt-2 space-y-2.5">
                <WobbleButton
                  type="submit"
                  disabled={verifyPending}
                  text={
                    verifyPending ? "Verifying Code..." : "Verify & Sign In"
                  }
                  hoverText={verifyPending ? "Verifying..." : "Enter Campus"}
                  fillColor="#4f46e5"
                  hoverColor="#4338ca"
                  fontFamily="font-dingos-bold"
                  className="w-full py-3.5 text-sm text-white shadow-xs"
                  icon={
                    verifyPending ? (
                      <svg
                        className="w-4 h-4 animate-spin text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <circle cx="12" cy="12" r="9" strokeWidth={2} />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 3v4"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                    )
                  }
                />

                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="w-full text-center text-xs font-bold text-gray-500 hover:text-gray-800 transition py-2 font-dingos-bold cursor-pointer"
                >
                  ← Use a different email address
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Note */}
        <p className="text-center text-[11px] text-gray-400">
          Campus Event Ticket &amp; Door Identification System
        </p>
      </div>
    </main>
  );
}
