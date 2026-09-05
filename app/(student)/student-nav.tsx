"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function StudentNav() {
  const pathname = usePathname();

  const isMyId = pathname === "/my-id";
  const isEvents = pathname.startsWith("/events");

  return (
    <nav className="fixed bottom-3 inset-x-3 z-40 max-w-xs mx-auto bg-white/90 backdrop-blur-md border border-gray-200/90 p-1.5 rounded-3xl flex items-center justify-between shadow-lg shadow-black/5 select-none">
      <Link
        href="/my-id"
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-2xl text-xs transition active:scale-95 tactile-btn ${
          isMyId
            ? "bg-indigo-600 text-white shadow-xs font-bold font-dingos-bold"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium"
        }`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <circle cx="9" cy="10" r="2" />
          <path strokeLinecap="round" d="M15 8h2m-2 4h2m-8 4h8" />
        </svg>
        <span className={isMyId ? "font-dingos-bold" : ""}>My ID</span>
      </Link>

      <Link
        href="/events"
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-2xl text-xs transition active:scale-95 tactile-btn ${
          isEvents
            ? "bg-indigo-600 text-white shadow-xs font-bold font-dingos-bold"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium"
        }`}
      >
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
        <span className={isEvents ? "font-dingos-bold" : ""}>Events</span>
      </Link>
    </nav>
  );
}
