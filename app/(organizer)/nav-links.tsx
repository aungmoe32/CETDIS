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
    <nav className="w-56 border-r border-gray-200 bg-white p-4 space-y-1.5 hidden sm:block min-h-[calc(100vh-3.5rem)]">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 pb-2 pt-1">
        Navigation
      </p>

      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href === "/events/all" && pathname.startsWith("/events/") && pathname !== "/events/new");

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
              isActive
                ? "bg-indigo-50 text-indigo-700 shadow-2xs font-bold"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <div
              className={`p-1.5 rounded-lg ${
                isActive ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              {item.icon}
            </div>
            <div className="min-w-0">
              <span className="block truncate">{item.label}</span>
              <span className="block text-[10px] text-gray-400 font-normal truncate">
                {item.sublabel}
              </span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-2 py-1.5 flex sm:hidden items-center justify-around shadow-lg">
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href === "/events/all" && pathname.startsWith("/events/") && pathname !== "/events/new");

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
              isActive ? "text-indigo-600 font-bold" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <div
              className={`p-1 rounded-lg ${
                isActive ? "bg-indigo-50 text-indigo-600" : "text-gray-500"
              }`}
            >
              {item.icon}
            </div>
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
