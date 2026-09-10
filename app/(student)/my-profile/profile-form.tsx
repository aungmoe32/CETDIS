"use client";

import { useActionState, useState } from "react";
import { updateStudentNameAction, type ProfileActionState } from "./actions";
import WobbleButton from "@/components/ui/wobble-button";

interface Props {
  initialName: string;
  email: string;
  role: string;
  createdAt: string;
}

const initialState: ProfileActionState = {};

export default function StudentProfileForm({
  initialName,
  email,
  role,
  createdAt,
}: Props) {
  const [name, setName] = useState(initialName);
  const [showEmail, setShowEmail] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (
      prev: ProfileActionState,
      formData: FormData,
    ): Promise<ProfileActionState> => {
      const result = await updateStudentNameAction(prev, formData);
      return result ?? prev;
    },
    initialState,
  );

  const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <form
      action={formAction}
      className="rounded-3xl border border-gray-200/90 bg-white p-5 sm:p-8 shadow-xs space-y-6"
    >
      {/* Success Notification */}
      {state.success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs font-medium text-emerald-800 flex items-start gap-2.5 animate-in fade-in duration-200">
          <svg
            className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <div>
            <p className="font-bold font-dingos-bold">Profile Updated</p>
            <p className="text-emerald-700 mt-0.5">
              {state.message || "Your display name has been saved."}
            </p>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {state.error && (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-xs font-medium text-red-800 flex items-start gap-2.5 animate-in fade-in duration-200">
          <svg
            className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"
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
          <div>
            <p className="font-bold font-dingos-bold">Unable to save changes</p>
            <p className="text-red-700 mt-0.5">{state.error}</p>
          </div>
        </div>
      )}

      {/* Field: Full Name (Editable) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="fullName"
            className="block text-xs font-bold uppercase tracking-wider text-gray-700 font-dingos-bold"
          >
            Display Name / Full Name <span className="text-indigo-600">*</span>
          </label>
          <span className="text-[10px] text-gray-400 font-medium">
            {name.length}/80 chars
          </span>
        </div>
        <div className="relative">
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex Morgan"
            autoComplete="off"
            suppressHydrationWarning
            className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-150 transition"
          />
        </div>
        <p className="text-[11px] text-gray-400">
          Displayed on your Digital Student ID pass, event RSVP tickets, and gate check-in lists.
        </p>
      </div>

      {/* Field: Email Address (Read-only, masked with Eye toggle) */}
      <div className="space-y-1.5 pt-2 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <label
            htmlFor="email"
            className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-dingos-bold"
          >
            Email Address
          </label>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-400 font-dingos-bold">
            <svg
              className="w-3 h-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span>Read-Only</span>
          </span>
        </div>
        <div className="relative flex items-center">
          <input
            id="email"
            type={showEmail ? "text" : "password"}
            disabled
            value={email}
            className="w-full rounded-2xl border border-gray-200 bg-gray-100/70 pl-4 pr-11 py-3 text-sm text-gray-500 cursor-not-allowed select-none font-medium tracking-normal"
          />
          <button
            type="button"
            onClick={() => setShowEmail((prev) => !prev)}
            className="absolute right-3 p-1 rounded-lg text-gray-400 hover:text-gray-600 active:scale-95 transition focus:outline-none cursor-pointer"
            title={showEmail ? "Hide email address" : "Show email address"}
            aria-label={showEmail ? "Hide email address" : "Show email address"}
          >
            {showEmail ? (
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
                  d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                />
              </svg>
            ) : (
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
                  d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            )}
          </button>
        </div>
        <p className="text-[11px] text-gray-400">
          Email is tied to your Supabase Email OTP authentication identity and cannot be modified here.
        </p>
      </div>

      {/* Field: Account Role & Verification (Read-only) */}
      <div className="space-y-1.5 pt-2 border-t border-gray-100">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-dingos-bold">
          Permissions &amp; Member Since
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-dingos-bold">
                Access Level
              </p>
              <p className="text-xs font-bold text-gray-800 font-dingos-bold capitalize mt-0.5">
                Campus {role}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-dingos-bold">
              ✓ Verified
            </span>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-dingos-bold">
                Member Since
              </p>
              <p className="text-xs font-bold text-gray-800 font-dingos-bold mt-0.5">
                {formattedDate}
              </p>
            </div>
            <span className="text-gray-400">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
        <WobbleButton
          type="submit"
          disabled={pending || !name.trim()}
          text={pending ? "Saving Changes..." : "Save Changes"}
          hoverText={pending ? "Saving..." : "Update Name ✨"}
          fillColor="#4f46e5"
          hoverColor="#4338ca"
          fontFamily="font-dingos-bold"
          className="w-full sm:w-auto px-7 py-3 text-xs sm:text-sm text-white shadow-xs"
          icon={
            pending ? (
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )
          }
        />
      </div>
    </form>
  );
}
