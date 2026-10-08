"use client";

import { useState } from "react";
import Link from "next/link";

interface Props {
  userRole?: string | null;
  userName?: string | null;
  isLoggedIn: boolean;
}

export default function HomepageNav({ userRole, userName, isLoggedIn }: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Determine user portal URL based on role
  let portalUrl = "/my-id";
  let portalLabel = "My Student ID";

  if (userRole === "organizer") {
    portalUrl = "/dashboard";
    portalLabel = "Organizer Dashboard";
  } else if (userRole === "developer") {
    portalUrl = "/developer/dashboard";
    portalLabel = "Developer Hub";
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 transition-all select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
              >
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="5" />
                <circle
                  cx="12"
                  cy="12"
                  r="1.5"
                  fill="currentColor"
                  strokeWidth={0}
                />
              </svg>
            </div>
            <div>
              <span className="font-dingos-bold text-xl sm:text-2xl text-gray-950 tracking-tight block leading-tight">
                CEDIS
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#623795] block -mt-0.5">
                Campus Events
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-600 font-dingos-bold">
            <Link
              href="/events"
              className="hover:text-[#623795] transition-colors"
            >
              Discover Events
            </Link>
            <a href="#about" className="hover:text-[#623795] transition-colors">
              What is CEDIS?
            </a>
            <a
              href="#attendees"
              className="hover:text-[#623795] transition-colors"
            >
              For Students
            </a>
            <a
              href="#organizers"
              className="hover:text-[#623795] transition-colors"
            >
              For Organizers
            </a>
            <a
              href="mailto:aungmoemyintthu@gmail.com"
              className="hover:text-[#623795] transition-colors text-purple-700"
            >
              Contact Us
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <Link
                href={portalUrl}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#623795] to-[#7E4ABF] hover:from-[#522c80] hover:to-[#6c3ea5] text-white px-5 py-2.5 text-xs sm:text-sm font-bold shadow-md shadow-purple-700/20 active:scale-95 transition font-dingos-bold"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{portalLabel}</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full px-5 py-2.5 text-xs sm:text-sm font-bold text-gray-700 hover:text-[#623795] hover:bg-purple-50/60 transition font-dingos-bold"
                >
                  Log In
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#623795] to-[#DF2490] hover:opacity-95 text-white px-5 py-2.5 text-xs sm:text-sm font-bold shadow-md shadow-pink-500/20 active:scale-95 transition font-dingos-bold"
                >
                  <span>Get Started</span>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2.2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {isLoggedIn && (
              <Link
                href={portalUrl}
                className="rounded-full bg-[#623795] text-white px-3.5 py-1.5 text-xs font-bold font-dingos-bold shrink-0"
              >
                Portal
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-gray-700 hover:bg-gray-100 transition"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-150">
          <Link
            href="/events"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-xl text-sm font-bold text-gray-900 hover:bg-purple-50 font-dingos-bold"
          >
            Discover Events
          </Link>
          <a
            href="#about"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-xl text-sm font-bold text-gray-700 hover:bg-purple-50 font-dingos-bold"
          >
            What is CEDIS?
          </a>
          <a
            href="#attendees"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-xl text-sm font-bold text-gray-700 hover:bg-purple-50 font-dingos-bold"
          >
            For Students
          </a>
          <a
            href="#organizers"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-xl text-sm font-bold text-gray-700 hover:bg-purple-50 font-dingos-bold"
          >
            For Organizers
          </a>
          <a
            href="mailto:aungmoemyintthu@gmail.com"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-xl text-sm font-bold text-purple-700 hover:bg-purple-50 font-dingos-bold"
          >
            Contact Us (aungmoemyintthu@gmail.com)
          </a>

          <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
            {isLoggedIn ? (
              <Link
                href={portalUrl}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center rounded-full bg-gradient-to-r from-[#623795] to-[#DF2490] text-white py-3 text-sm font-bold font-dingos-bold shadow-sm"
              >
                Go to {portalLabel}
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center rounded-full border border-gray-200 text-gray-800 py-2.5 text-sm font-bold font-dingos-bold hover:bg-gray-50"
                >
                  Log In
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center rounded-full bg-gradient-to-r from-[#623795] to-[#DF2490] text-white py-3 text-sm font-bold font-dingos-bold shadow-sm"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
