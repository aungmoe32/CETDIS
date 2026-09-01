"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { exportEventGuestListCsvAction } from "@/app/(organizer)/dashboard/actions";

export interface EventItem {
  id: string;
  title: string;
  dateTime: Date;
  location: string | null;
  maxCapacity: number;
  price: number;
  totalRegistered: number;
  checkedIn: number;
  walkUpCount: number;
}

interface Props {
  initialEvents: EventItem[];
}

type StatusFilter = "all" | "upcoming" | "today" | "past";
type PriceFilter = "all" | "free" | "paid";
type SortOption = "date_asc" | "date_desc" | "registered_desc";

export default function EventsListClient({ initialEvents }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("date_asc");
  const [exportingId, setExportingId] = useState<string | null>(null);

  const now = new Date();
  const todayDateString = now.toDateString();

  const handleExportCsv = async (eventId: string) => {
    setExportingId(eventId);
    try {
      const res = await exportEventGuestListCsvAction(eventId);
      if (res.success && res.csv && res.filename) {
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", res.filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        alert(res.error || "Failed to export guest list");
      }
    } catch (err: unknown) {
      alert(`Export failed: ${(err as Error).message || String(err)}`);
    } finally {
      setExportingId(null);
    }
  };

  // Compute status counts for badges
  const counts = useMemo(() => {
    let upcoming = 0;
    let today = 0;
    let past = 0;

    initialEvents.forEach((e) => {
      const d = new Date(e.dateTime);
      const isToday = d.toDateString() === todayDateString;
      if (isToday) {
        today++;
      } else if (d.getTime() > now.getTime()) {
        upcoming++;
      } else {
        past++;
      }
    });

    return { all: initialEvents.length, upcoming, today, past };
  }, [initialEvents, todayDateString]);

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    return initialEvents
      .filter((event) => {
        const eventDate = new Date(event.dateTime);
        const isToday = eventDate.toDateString() === todayDateString;
        const isPast = eventDate.getTime() < now.getTime() && !isToday;
        const isUpcoming = eventDate.getTime() > now.getTime() && !isToday;

        // Status Filter
        if (statusFilter === "today" && !isToday) return false;
        if (statusFilter === "upcoming" && !isUpcoming) return false;
        if (statusFilter === "past" && !isPast) return false;

        // Price Filter
        const isFree = !event.price || event.price === 0;
        if (priceFilter === "free" && !isFree) return false;
        if (priceFilter === "paid" && isFree) return false;

        // Search Query Filter
        if (searchQuery.trim().length > 0) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = event.title.toLowerCase().includes(q);
          const matchLocation = (event.location || "").toLowerCase().includes(q);
          if (!matchTitle && !matchLocation) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.dateTime).getTime();
        const timeB = new Date(b.dateTime).getTime();

        if (sortOption === "date_asc") return timeA - timeB;
        if (sortOption === "date_desc") return timeB - timeA;
        if (sortOption === "registered_desc") return b.totalRegistered - a.totalRegistered;
        return 0;
      });
  }, [initialEvents, searchQuery, statusFilter, priceFilter, sortOption, todayDateString]);

  return (
    <div className="space-y-4">
      {/* ── Filter Controls & Search Bar ───────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs space-y-3.5">
        {/* Search Input */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events by title or location..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-10 py-2 text-sm text-gray-900 placeholder-gray-400 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter Pills & Selectors */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-gray-100">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {(
              [
                { id: "all", label: "All", count: counts.all },
                { id: "today", label: "Today", count: counts.today },
                { id: "upcoming", label: "Upcoming", count: counts.upcoming },
                { id: "past", label: "Past", count: counts.past },
              ] as const
            ).map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? "bg-white/20 text-white" : "bg-white text-gray-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Secondary Selectors (Price & Sort) */}
          <div className="flex items-center gap-2">
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value as PriceFilter)}
              className="rounded-xl border border-gray-200 bg-gray-50/50 px-2.5 py-1.5 text-xs text-gray-700 font-medium focus:bg-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Prices</option>
              <option value="free">Free Only</option>
              <option value="paid">Paid Only</option>
            </select>

            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="rounded-xl border border-gray-200 bg-gray-50/50 px-2.5 py-1.5 text-xs text-gray-700 font-medium focus:bg-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="date_asc">Date (Soonest first)</option>
              <option value="date_desc">Date (Latest first)</option>
              <option value="registered_desc">Registrations (High)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Event Results Count ────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span>Showing {filteredEvents.length} of {initialEvents.length} events</span>
        {(searchQuery || statusFilter !== "all" || priceFilter !== "all") && (
          <button
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
              setPriceFilter("all");
            }}
            className="text-indigo-600 hover:text-indigo-800 font-semibold"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* ── Events Cards List ──────────────────────────────────────────── */}
      {filteredEvents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-1">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-800">No matching events found</p>
          <p className="text-xs text-gray-400">
            Try adjusting your search keywords or filter selections
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event) => {
            const eventDate = new Date(event.dateTime);
            const isToday = eventDate.toDateString() === todayDateString;
            const isPast = eventDate.getTime() < now.getTime() && !isToday;
            const isFree = !event.price || event.price === 0;

            const capacityPct = Math.min(
              100,
              event.maxCapacity > 0
                ? Math.round((event.totalRegistered / event.maxCapacity) * 100)
                : 0,
            );
            const spotsLeft = Math.max(0, event.maxCapacity - event.totalRegistered);

            const checkInPct =
              event.totalRegistered > 0
                ? Math.round((event.checkedIn / event.totalRegistered) * 100)
                : 0;

            return (
              <div
                key={event.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-xs hover:border-gray-300 transition space-y-3.5"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-gray-900 truncate">
                        {event.title}
                      </h3>

                      {isToday && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                          Today
                        </span>
                      )}

                      {isPast && (
                        <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          Ended
                        </span>
                      )}

                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                          isFree
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        }`}
                      >
                        {isFree ? "Free" : `${event.price.toLocaleString()} MMK`}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 flex-wrap">
                      <span>
                        {eventDate.toLocaleDateString([], {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}{" "}
                        at{" "}
                        {eventDate.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span>·</span>
                      <span>{event.location || "Campus"}</span>
                    </p>
                  </div>

                  <Link
                    href={`/scan?event=${event.id}`}
                    className="flex-shrink-0 inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 active:scale-95 transition shadow-xs"
                  >
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
                        d="M3 7V5a2 2 0 012-2h2m10 0h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"
                      />
                    </svg>
                    <span>Scan</span>
                  </Link>
                </div>

                {/* Progress Indicators */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="rounded-xl bg-gray-50 p-2.5 border border-gray-100 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Capacity</span>
                      <span className="font-bold text-gray-900 font-mono">
                        {event.totalRegistered} / {event.maxCapacity} ({capacityPct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-600"
                        style={{ width: `${capacityPct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-gray-400">
                      {spotsLeft > 0 ? `${spotsLeft} spots available` : "Full capacity reached"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-2.5 border border-gray-100 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Admitted</span>
                      <span className="font-bold text-emerald-700 font-mono">
                        {event.checkedIn} / {event.totalRegistered} ({checkInPct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${checkInPct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-gray-400">
                      {event.totalRegistered - event.checkedIn} remaining
                    </p>
                  </div>
                </div>

                {/* Cash Box badge */}
                {event.walkUpCount > 0 && (
                  <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 px-3 py-1.5 flex items-center justify-between text-xs">
                    <span className="text-emerald-900 font-medium">
                      {event.walkUpCount} walk-up sale{event.walkUpCount > 1 ? "s" : ""}
                    </span>
                    <span className="font-bold text-emerald-950 font-mono">
                      {(event.walkUpCount * (event.price ?? 0)).toLocaleString()} MMK in cash box
                    </span>
                  </div>
                )}

                {/* Actions Footer */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportCsv(event.id)}
                    disabled={exportingId === event.id}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 disabled:opacity-50 transition shadow-2xs"
                  >
                    {exportingId === event.id ? (
                      <>
                        <svg
                          className="w-3.5 h-3.5 animate-spin text-gray-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                        >
                          <circle cx="12" cy="12" r="9" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v4" />
                        </svg>
                        <span>Exporting...</span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-3.5 h-3.5 text-gray-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        <span>Export CSV</span>
                      </>
                    )}
                  </button>

                  <Link
                    href={`/events/${event.id}/edit`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition shadow-2xs"
                  >
                    <svg
                      className="w-3.5 h-3.5 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    <span>Edit</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
