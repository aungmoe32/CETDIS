"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    sublabel: "Today & Live",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/events/all",
    label: "All Events",
    sublabel: "Schedule & Filters",
    icon: (
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
    ),
  },
  {
    href: "/events/new",
    label: "Create Event",
    sublabel: "New Entry",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m-4-4h8" />
      </svg>
    ),
  },
  {
    href: "/admin",
    label: "NFC Admin",
    sublabel: "Student Lookup & Tags",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" strokeWidth={0} />
      </svg>
    ),
  },
];

export function DesktopSidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="w-60 border-r border-gray-200/80 bg-white/95 backdrop-blur-xs p-4 space-y-2 hidden sm:block min-h-[calc(100vh-3.5rem)] select-none">
      <div className="px-3 pb-1 pt-0.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-dingos-bold">
          Navigation
        </span>
      </div>

      <nav className="space-y-1.5">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === "/events/all" &&
              pathname.startsWith("/events/") &&
              pathname !== "/events/new");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition tactile-btn ${
                isActive
                  ? "bg-indigo-50/90 text-indigo-900 border border-indigo-200/80 shadow-2xs font-bold"
                  : "text-gray-600 hover:bg-gray-50/80 hover:text-gray-900"
              }`}
            >
              <div
                className={`p-2 rounded-xl transition-transform duration-200 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-xs scale-105"
                    : "bg-gray-100 text-gray-500 group-hover:scale-105"
                }`}
              >
                {item.icon}
              </div>
              <div className="min-w-0">
                <span
                  className={`block truncate text-sm ${
                    isActive ? "font-dingos-bold text-indigo-950" : "font-dingos-bold text-gray-800"
                  }`}
                >
                  {item.label}
                </span>
                <span className="block text-[10px] text-gray-400 font-medium truncate mt-0.5">
                  {item.sublabel}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-3 inset-x-3 z-40 max-w-md mx-auto bg-white/90 backdrop-blur-md border border-gray-200/90 px-2 py-1.5 rounded-3xl flex sm:hidden items-center justify-around shadow-lg shadow-black/5 select-none">
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href === "/events/all" &&
            pathname.startsWith("/events/") &&
            pathname !== "/events/new");

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition active:scale-90 ${
              isActive
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <div className="p-0.5">
              {item.icon}
            </div>
            <span
              className={`text-[10px] tracking-tight leading-none mt-1 ${
                isActive ? "font-dingos-bold text-white" : "font-medium text-gray-600"
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
