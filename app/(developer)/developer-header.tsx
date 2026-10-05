"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signOut } from "@/app/(auth)/login/actions";

export function DeveloperHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-gray-200/80 bg-white/90 backdrop-blur-md px-4 sm:px-5 py-2.5 sm:py-3 transition-colors select-none">
      <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto">
        {/* Left: Brand & Role */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link href="/developer/dashboard" className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center flex-shrink-0 shadow-2xs">
              <svg
                className="h-4 w-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
              >
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" strokeWidth={0} />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-base tracking-tight font-dingos-bold">
              CETDIS
            </span>
          </Link>
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 px-2 py-0.5 bg-indigo-50 border border-indigo-200/80 rounded-full font-dingos-bold">
            Platform Admin
          </span>
        </div>

        {/* Right: User Account Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-haspopup="true"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:scale-95 text-gray-700 text-xs font-semibold transition tactile-btn shadow-2xs cursor-pointer"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center flex-shrink-0 text-[10px] font-bold font-dingos-bold">
              <svg
                className="w-3 h-3 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
            </div>
            <span className="hidden sm:inline font-dingos-bold text-[11px] text-gray-800">
              Account
            </span>
            <svg
              className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${
                menuOpen ? "rotate-180 text-indigo-600" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-white border border-gray-200/90 shadow-lg p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 select-none space-y-0.5"
            >
              <div className="px-3 py-1.5 border-b border-gray-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-dingos-bold">
                  Signed in as
                </p>
                <p className="text-xs font-bold text-gray-800 font-dingos-bold truncate">
                  Platform Developer
                </p>
              </div>

              <Link
                href="/developer/profile"
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-900 transition tactile-btn font-dingos-bold"
              >
                <svg
                  className="w-4 h-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
                <span>Profile</span>
              </Link>

              <div className="border-t border-gray-100 my-0.5" />

              <form action={signOut} className="w-full">
                <button
                  type="submit"
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 active:scale-95 transition tactile-btn font-dingos-bold text-left cursor-pointer"
                >
                  <svg
                    className="w-4 h-4 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                    />
                  </svg>
                  <span>Sign Out</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
