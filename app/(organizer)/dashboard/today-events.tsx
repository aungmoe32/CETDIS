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

  // Helper to determine if event is today or actively within next 24 hours
  const isEventActive = (eventDate: Date) => {
    const isToday = eventDate.toDateString() === todayDateString;
    const diffMs = eventDate.getTime() - now.getTime();
    const isNext24h = diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000;
    const isRecentlyStarted = diffMs <= 0 && diffMs >= -12 * 60 * 60 * 1000;
    return isToday || isNext24h || isRecentlyStarted;
  };

  const activeEvents = events.filter((e) =>
    isEventActive(new Date(e.dateTime)),
  );

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
    <div className="space-y-4">
      {/* ── Today & Active Events (Live Metrics) ───────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h3 className="text-xl font-bold text-gray-900 font-dingos-bold">
            Today&apos;s Events &amp; Live Metrics
          </h3>
          {activeEvents.length > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Live
            </span>
          )}
        </div>
        <Link
          href="/events/all"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 tactile-btn"
        >
          <span>View All Events</span>
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
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </div>

      {activeEvents.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-slate-50/50 p-8 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 text-gray-400 flex items-center justify-center mx-auto shadow-2xs">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <p className="text-base font-bold text-gray-800 font-dingos-bold">
              No events scheduled for today
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Your dashboard is dedicated to active entrance operations.
            </p>
          </div>
          <Link
            href="/events/all"
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-2xs tactile-btn"
          >
            <span>Browse All &amp; Upcoming Events</span>
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
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
            const spotsLeft = Math.max(
              0,
              event.maxCapacity - event.totalRegistered,
            );

            // Check-in crowd calculations
            const checkInPct =
              event.totalRegistered > 0
                ? Math.round((event.checkedIn / event.totalRegistered) * 100)
                : 0;
            const waitingCount = Math.max(
              0,
              event.totalRegistered - event.checkedIn,
            );

            return (
              <div
                key={event.id}
                className="rounded-3xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-xs hover:border-gray-300 transition space-y-4 tactile-hover"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-lg font-bold text-gray-900 truncate font-dingos-bold">
                        {event.title}
                      </h4>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          isFree
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        }`}
                      >
                        {isFree
                          ? "Free"
                          : `${event.price.toLocaleString()} MMK`}
                      </span>
                      {isToday && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
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
                    className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 active:scale-95 transition shadow-xs tactile-btn font-dingos-bold"
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
                    <span>Scan Door</span>
                  </Link>
                </div>

                {/* Dual Visual Progress Bars */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Metric 1: Capacity Limit Bar */}
                  <div className="rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100 space-y-2">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-bold text-gray-600 font-dingos-bold">
                        Capacity
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-normal text-gray-900 font-bebas text-xl tracking-wide">
                          {event.totalRegistered} / {event.maxCapacity}
                        </span>
                        <span className="text-[11px] text-gray-500 font-medium">
                          ({capacityPct}%)
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          capacityPct >= 100
                            ? "bg-red-500"
                            : capacityPct >= 85
                              ? "bg-amber-500"
                              : "bg-indigo-600"
                        }`}
                        style={{ width: `${capacityPct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium">
                      {spotsLeft > 0
                        ? `${spotsLeft} spots available`
                        : "Full capacity reached"}
                    </p>
                  </div>

                  {/* Metric 2: Live Check-In Rate Bar */}
                  <div className="rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100 space-y-2">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-bold text-gray-600 font-dingos-bold">
                        Admitted at Door
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-normal text-emerald-700 font-bebas text-xl tracking-wide">
                          {event.checkedIn} / {event.totalRegistered}
                        </span>
                        <span className="text-[11px] text-emerald-700 font-medium">
                          ({checkInPct}%)
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${checkInPct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium">
                      {waitingCount > 0
                        ? `${waitingCount} waiting or expected`
                        : "All registered attendees checked in"}
                    </p>
                  </div>
                </div>

                {/* Cash Box Reconciliation Pill (if walk-ups exist) */}
                {event.walkUpCount > 0 && (
                  <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200/80 px-4 py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-emerald-900 font-medium">
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
                      <span className="font-dingos-bold">
                        {event.walkUpCount} Walk-Up Sale
                        {event.walkUpCount > 1 ? "s" : ""}
                      </span>
                    </div>
                    <span className="font-normal text-emerald-950 font-dingos text-lg tracking-wide">
                      {(
                        event.walkUpCount * (event.price ?? 0)
                      ).toLocaleString()}{" "}
                      MMK cash box
                    </span>
                  </div>
                )}

                {/* Quick Actions Footer */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleExportCsv(event.id)}
                    disabled={exportingId === event.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 disabled:opacity-50 transition shadow-2xs tactile-btn"
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
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 3v4"
                          />
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
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition shadow-2xs tactile-btn"
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
    </div>
  );
}
