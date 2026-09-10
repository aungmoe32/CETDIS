"use client";

import { useState } from "react";

export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "••••••••";
  const atIndex = email.indexOf("@");
  const firstChar = email.charAt(0);
  const domain = email.slice(atIndex + 1);
  return `${firstChar}*****@${domain}`;
}

export default function MaskedEmail({ email }: { email: string }) {
  const [showEmail, setShowEmail] = useState(false);

  return (
    <div className="flex items-center gap-1.5 mt-0.5">
      <span
        className={`text-xs ${
          showEmail
            ? "text-gray-600 font-medium select-all"
            : "text-gray-400 font-mono tracking-tight"
        }`}
      >
        {showEmail ? email : maskEmail(email)}
      </span>
      <button
        type="button"
        onClick={() => setShowEmail((prev) => !prev)}
        className="p-0.5 text-gray-400 hover:text-gray-600 active:scale-95 transition rounded cursor-pointer"
        title={showEmail ? "Hide email address" : "Show email address"}
        aria-label={showEmail ? "Hide email address" : "Show email address"}
      >
        {showEmail ? (
          <svg
            className="w-3.5 h-3.5"
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
            className="w-3.5 h-3.5"
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
  );
}
