"use client";

import { useState } from "react";
import Link from "next/link";
import { exportEventGuestListCsvAction } from "./actions";

export interface DashboardEventItem {
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
  events: DashboardEventItem[];
}

export default function TodayEvents({ events }: Props) {
  const [exportingId, setExportingId] = useState<string | null>(null);

  const now = new Date();
  const todayDateString = now.toDateString();

  // Helper to determine if event is today or within next 24 hours
  const isEventActive = (eventDate: Date) => {
    const isToday = eventDate.toDateString() === todayDateString;
    const diffMs = eventDate.getTime() - now.getTime();
    const isNext24h = diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000;
    const isRecentlyStarted = diffMs <= 0 && diffMs >= -12 * 60 * 60 * 1000;
    return isToday || isNext24h || isRecentlyStarted;
  };

  const activeEvents = events.filter((e) => isEventActive(new Date(e.dateTime)));
  const otherEvents = events.filter((e) => !isEventActive(new Date(e.dateTime)));

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

  return (
    <div className="space-y-6">
      {/* ── 1. Today & Active Events (Live Metrics) ────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">
              Today&apos;s Events &amp; Live Metrics
            </h3>
            {activeEvents.length > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Live
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500 font-medium">
            {activeEvents.length} active
          </span>
        </div>

        {activeEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-2">
              <svg
                className="w-5 h-5"
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
            <p className="text-sm font-semibold text-gray-700">No events scheduled for today</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Upcoming events are listed in the schedule below
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeEvents.map((event) => {
              const eventDate = new Date(event.dateTime);
              const isToday = eventDate.toDateString() === todayDateString;
              const isFree = !event.price || event.price === 0;

              // Capacity calculations
              const capacityPct = Math.min(
                100,
                event.maxCapacity > 0
                  ? Math.round((event.totalRegistered / event.maxCapacity) * 100)
                  : 0,
              );
              const spotsLeft = Math.max(0, event.maxCapacity - event.totalRegistered);

              // Check-in crowd calculations
              const checkInPct =
                event.totalRegistered > 0
                  ? Math.round((event.checkedIn / event.totalRegistered) * 100)
                  : 0;
              const waitingCount = Math.max(0, event.totalRegistered - event.checkedIn);

              return (
                <div
                  key={event.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-xs hover:border-gray-300 transition space-y-4"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-bold text-gray-900 truncate">
                          {event.title}
                        </h4>
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                            isFree
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          }`}
                        >
                          {isFree ? "Free" : `${event.price.toLocaleString()} MMK`}
                        </span>
                        {isToday && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded">
                            Today
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 flex-wrap">
                        <span>
                          {eventDate.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span>·</span>
                        <span>{event.location || "Main Campus"}</span>
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

                  {/* Dual Visual Progress Bars */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Metric 1: Capacity Limit Bar */}
                    <div className="rounded-xl bg-gray-50 p-3 border border-gray-100 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-600">Capacity</span>
                        <span className="font-bold text-gray-900 font-mono">
                          {event.totalRegistered} / {event.maxCapacity} ({capacityPct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            capacityPct >= 100
                              ? "bg-red-500"
                              : capacityPct >= 85
                                ? "bg-amber-500"
                                : "bg-indigo-600"
                          }`}
                          style={{ width: `${capacityPct}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-500">
                        {spotsLeft > 0 ? `${spotsLeft} spots available` : "Full capacity reached"}
                      </p>
                    </div>

                    {/* Metric 2: Live Check-In Rate Bar */}
                    <div className="rounded-xl bg-gray-50 p-3 border border-gray-100 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-600">Admitted at Door</span>
                        <span className="font-bold text-emerald-700 font-mono">
                          {event.checkedIn} / {event.totalRegistered} ({checkInPct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${checkInPct}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-500">
                        {waitingCount > 0
                          ? `${waitingCount} waiting or expected`
                          : "All registered attendees checked in"}
                      </p>
                    </div>
                  </div>

                  {/* Cash Box Reconciliation Pill (if walk-ups exist) */}
                  {event.walkUpCount > 0 && (
                    <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 px-3 py-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-emerald-900 font-medium">
                        <svg
                          className="w-4 h-4 text-emerald-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        <span>
                          {event.walkUpCount} Walk-Up Sale{event.walkUpCount > 1 ? "s" : ""}
                        </span>
                      </div>
                      <span className="font-bold text-emerald-950 font-mono">
                        {(event.walkUpCount * (event.price ?? 0)).toLocaleString()} MMK cash box
                      </span>
                    </div>
                  )}

                  {/* Quick Actions Footer */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2 flex-wrap">
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
                      <span>Edit Details</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 2. Other / Upcoming Events ─────────────────────────────────── */}
      {otherEvents.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">
              Upcoming &amp; Other Events
            </h3>
            <span className="text-xs text-gray-500 font-medium">
              {otherEvents.length} scheduled
            </span>
          </div>

          <div className="space-y-2.5">
            {otherEvents.map((event) => {
              const isFree = !event.price || event.price === 0;
              const eventDate = new Date(event.dateTime);

              return (
                <div
                  key={event.id}
                  className="rounded-xl border border-gray-200 bg-white p-3.5 hover:border-gray-300 transition flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {event.title}
                      </p>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                          isFree
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        }`}
                      >
                        {isFree ? "Free" : `${event.price.toLocaleString()} MMK`}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {eventDate.toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      · {event.totalRegistered} registered · {event.maxCapacity - event.totalRegistered} spots left
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleExportCsv(event.id)}
                      disabled={exportingId === event.id}
                      className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 disabled:opacity-50 transition"
                      title="Export CSV"
                    >
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
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </button>

                    <Link
                      href={`/events/${event.id}/edit`}
                      className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 transition"
                      title="Edit Event"
                    >
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
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </Link>

                    <Link
                      href={`/scan?event=${event.id}`}
                      className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700 active:scale-95 transition"
                    >
                      Scan
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
