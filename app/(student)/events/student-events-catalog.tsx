"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

export interface StudentEventItem {
  id: string;
  title: string;
  dateTime: string; // ISO string
  location: string | null;
  maxCapacity: number;
  price: number;
  spotsLeft: number;
}

interface Props {
  initialEvents: StudentEventItem[];
}

type PriceFilter = "all" | "free" | "paid";

export default function StudentEventsCatalog({ initialEvents }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [availableOnly, setAvailableOnly] = useState(false);

  // Compute counts for filter pills
  const counts = useMemo(() => {
    let free = 0;
    let paid = 0;
    initialEvents.forEach((e) => {
      if (!e.price || e.price === 0) {
        free++;
      } else {
        paid++;
      }
    });
    return { total: initialEvents.length, free, paid };
  }, [initialEvents]);

  // Filter events by search query, price, and availability
  const filteredEvents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return initialEvents.filter((event) => {
      // Search matching (title or location)
      if (q) {
        const matchesTitle = event.title.toLowerCase().includes(q);
        const matchesLocation = event.location?.toLowerCase().includes(q) ?? false;
        if (!matchesTitle && !matchesLocation) return false;
      }

      // Price filter
      const isFree = !event.price || event.price === 0;
      if (priceFilter === "free" && !isFree) return false;
      if (priceFilter === "paid" && isFree) return false;

      // Available only filter
      if (availableOnly && event.spotsLeft <= 0) return false;

      return true;
    });
  }, [initialEvents, searchQuery, priceFilter, availableOnly]);

  const hasActiveFilters = searchQuery.trim() !== "" || priceFilter !== "all" || availableOnly;

  const resetFilters = () => {
    setSearchQuery("");
    setPriceFilter("all");
    setAvailableOnly(false);
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5 pb-24 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-dingos-bold tracking-tight">
            Campus Events
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Browse upcoming campus gatherings &amp; tickets
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold font-dingos-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
          <span>{initialEvents.length} Active</span>
        </span>
      </div>

      {/* Search Bar & Filter Controls */}
      {initialEvents.length > 0 && (
        <div className="space-y-3">
          {/* Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by event title or venue..."
              className="w-full rounded-2xl border border-gray-200/90 bg-white pl-10 pr-10 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              type="button"
              onClick={() => setPriceFilter("all")}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition tactile-btn shrink-0 ${
                priceFilter === "all"
                  ? "bg-indigo-600 text-white font-dingos-bold shadow-2xs"
                  : "bg-gray-100/90 text-gray-600 hover:bg-gray-200 font-medium"
              }`}
            >
              All ({counts.total})
            </button>

            <button
              type="button"
              onClick={() => setPriceFilter("free")}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition tactile-btn shrink-0 ${
                priceFilter === "free"
                  ? "bg-emerald-600 text-white font-dingos-bold shadow-2xs"
                  : "bg-gray-100/90 text-gray-600 hover:bg-gray-200 font-medium"
              }`}
            >
              Free ({counts.free})
            </button>

            {counts.paid > 0 && (
              <button
                type="button"
                onClick={() => setPriceFilter("paid")}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition tactile-btn shrink-0 ${
                  priceFilter === "paid"
                    ? "bg-indigo-600 text-white font-dingos-bold shadow-2xs"
                    : "bg-gray-100/90 text-gray-600 hover:bg-gray-200 font-medium"
                }`}
              >
                Paid ({counts.paid})
              </button>
            )}

            <button
              type="button"
              onClick={() => setAvailableOnly(!availableOnly)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition tactile-btn shrink-0 border ${
                availableOnly
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-dingos-bold"
                  : "border-transparent bg-gray-100/90 text-gray-600 hover:bg-gray-200 font-medium"
              }`}
            >
              Available Spots
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-[11px] font-bold text-gray-400 hover:text-gray-700 underline px-2 shrink-0 transition"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* No Events in Database Empty State */}
      {initialEvents.length === 0 && (
        <div className="rounded-3xl border border-gray-200/90 bg-white p-8 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
            <svg
              className="w-6 h-6"
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
          </div>
          <p className="text-sm font-bold text-gray-800 font-dingos-bold">
            No Upcoming Events
          </p>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            There are currently no scheduled events. Check back soon for new campus announcements.
          </p>
        </div>
      )}

      {/* Filtered Out Empty State */}
      {initialEvents.length > 0 && filteredEvents.length === 0 && (
        <div className="rounded-3xl border border-gray-200/90 bg-white p-8 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 mx-auto flex items-center justify-center">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-sm font-bold text-gray-800 font-dingos-bold">
            No matching events found
          </p>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            {searchQuery
              ? `No upcoming events match "${searchQuery}".`
              : "No events match the selected filters."}
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold font-dingos-bold transition tactile-btn"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Filter Result Counter */}
      {hasActiveFilters && filteredEvents.length > 0 && (
        <div className="flex items-center justify-between px-1 text-[11px] text-gray-400 font-medium">
          <span>
            Showing <strong className="text-gray-700 font-bold">{filteredEvents.length}</strong> of{" "}
            {initialEvents.length} events
          </span>
          <button
            type="button"
            onClick={resetFilters}
            className="text-indigo-600 hover:text-indigo-800 font-bold font-dingos-bold"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Event Cards List */}
      <ul className="space-y-3">
        {filteredEvents.map((event) => {
          const isFree = !event.price || event.price === 0;
          const dateObj = new Date(event.dateTime);
          const monthStr = dateObj
            .toLocaleDateString("en-US", { month: "short" })
            .toUpperCase();
          const dayStr = dateObj.getDate();
          const timeStr = dateObj.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <li key={event.id}>
              <Link
                href={`/events/${event.id}`}
                className="group block rounded-3xl border border-gray-200/90 bg-white p-4 sm:p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all tactile-hover"
              >
                <div className="flex items-start gap-3.5">
                  {/* Calendar Date Badge */}
                  <div className="flex flex-col items-center justify-center w-12 h-13 rounded-2xl bg-indigo-50/60 border border-indigo-100/80 shrink-0 text-center py-1 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <span className="text-[10px] font-bold text-indigo-600 group-hover:text-indigo-100 tracking-wider font-dingos-bold leading-none">
                      {monthStr}
                    </span>
                    <span className="text-lg font-bold text-gray-900 group-hover:text-white font-bebas leading-none mt-0.5">
                      {dayStr}
                    </span>
                  </div>

                  {/* Event Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-gray-900 text-sm sm:text-base font-dingos-bold tracking-tight truncate group-hover:text-indigo-600 transition-colors">
                        {event.title}
                      </p>
                      <span
                        className={`inline-flex items-center shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold font-dingos-bold ${
                          isFree
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        }`}
                      >
                        {isFree ? "Free" : `${event.price.toLocaleString()} MMK`}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 truncate">
                      <span>{timeStr}</span>
                      <span>·</span>
                      <span className="truncate">{event.location || "Campus Venue"}</span>
                    </p>

                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100 text-xs">
                      <span
                        className={`font-semibold text-[11px] ${
                          event.spotsLeft > 0 ? "text-emerald-600" : "text-red-500"
                        }`}
                      >
                        {event.spotsLeft > 0
                          ? `${event.spotsLeft} spots left`
                          : "Full Capacity"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform font-dingos-bold">
                        <span>Details</span>
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
