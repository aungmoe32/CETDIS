"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  searchStudentsForDashboardAction,
  manualCheckInAction,
  manualIssueNfcAction,
  type StudentSearchResult,
} from "./actions";

interface EventSummary {
  id: string;
  title: string;
  dateTime: Date;
  location: string | null;
  totalRegistered: number;
}

interface Props {
  events: EventSummary[];
}

export default function ActionCenter({ events }: Props) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StudentSearchResult[]>([]);
  const [isSearching, startSearchTransition] = useTransition();
  const [actionStatus, setActionStatus] = useState<{
    id: string;
    type: "checkin" | "issue";
    loading: boolean;
    error?: string;
  } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter events happening today or active upcoming
  const todayEvents = events.filter((e) => {
    const eventDate = new Date(e.dateTime);
    const today = new Date();
    return (
      eventDate.getFullYear() === today.getFullYear() &&
      eventDate.getMonth() === today.getMonth() &&
      eventDate.getDate() === today.getDate()
    );
  });

  // If there's at least 1 today event, use today's events for smart scan; otherwise all events
  const targetEvents = todayEvents.length > 0 ? todayEvents : events;

  const handleOpenScanner = () => {
    if (targetEvents.length === 1) {
      router.push(`/scan?event=${targetEvents[0].id}`);
    } else if (targetEvents.length > 1) {
      setIsModalOpen(true);
    } else if (events.length === 1) {
      router.push(`/scan?event=${events[0].id}`);
    } else if (events.length > 1) {
      setIsModalOpen(true);
    } else {
      router.push("/events/new");
    }
  };

  // Debounced live search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      startSearchTransition(async () => {
        const res = await searchStudentsForDashboardAction(trimmed);
        if (res.data) {
          setSearchResults(res.data);
        }
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleManualCheckIn = async (ticketId: string) => {
    setActionStatus({ id: ticketId, type: "checkin", loading: true });
    try {
      const res = await manualCheckInAction(ticketId);
      if (res.error) {
        setActionStatus({ id: ticketId, type: "checkin", loading: false, error: res.error });
      } else {
        // Update local search results state immediately
        setSearchResults((prev) =>
          prev.map((student) => ({
            ...student,
            tickets: student.tickets.map((t) =>
              t.ticketId === ticketId
                ? { ...t, isCheckedIn: true, scannedAt: new Date() }
                : t,
            ),
          })),
        );
        setActionStatus(null);
      }
    } catch {
      setActionStatus({ id: ticketId, type: "checkin", loading: false, error: "Check-in failed" });
    }
  };

  const handleManualIssueTag = async (studentId: string, token: string) => {
    setActionStatus({ id: studentId, type: "issue", loading: true });
    try {
      const res = await manualIssueNfcAction(token);
      if (res.error) {
        setActionStatus({ id: studentId, type: "issue", loading: false, error: res.error });
      } else {
        // Update student local status
        setSearchResults((prev) =>
          prev.map((student) =>
            student.id === studentId
              ? { ...student, nfcIssued: true, purchasedNfc: true }
              : student,
          ),
        );
        setActionStatus(null);
      }
    } catch {
      setActionStatus({ id: studentId, type: "issue", loading: false, error: "Issue failed" });
    }
  };

  return (
    <section className="mb-8 space-y-4">
      {/* ── 1. Primary Action: Massive Scanner Touch Target ──────────────── */}
      <div>
        <button
          onClick={handleOpenScanner}
          className="w-full group relative flex items-center justify-between gap-4 rounded-2xl bg-indigo-600 px-5 py-4 text-white shadow-md hover:bg-indigo-700 active:scale-[0.99] transition"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
              <svg
                className="w-6 h-6 text-white"
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
                <rect x="7" y="7" width="10" height="10" rx="1.5" />
              </svg>
            </div>
            <div className="text-left min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold tracking-tight">
                  Open Scanner
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                  QR & NFC
                </span>
              </div>
              <p className="text-xs text-indigo-100 mt-0.5 truncate">
                {targetEvents.length === 1
                  ? `Scan for ${targetEvents[0].title}`
                  : targetEvents.length > 1
                    ? `${targetEvents.length} events active · Tap to choose`
                    : events.length > 0
                      ? "Select event to begin scanning"
                      : "Create an event first"}
              </p>
            </div>
          </div>

          <div className="hidden xs:flex items-center gap-1.5 text-xs font-semibold bg-white/10 px-3 py-2 rounded-xl border border-white/10 group-hover:bg-white/20 transition flex-shrink-0">
            <span>Launch</span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>

      {/* ── 2. Manual Lookup: Live Search Bar ──────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="manual-student-lookup"
            className="text-xs font-bold uppercase tracking-wider text-gray-500"
          >
            Manual Attendee Lookup
          </label>
          <span className="text-[11px] text-gray-400">
            For dead phones or cracked screens
          </span>
        </div>

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
            id="manual-student-lookup"
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type student name or email to check in..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-10 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
          />

          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSearchResults([]);
                searchInputRef.current?.focus();
              }}
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

        {/* ── Search Results Container ──────────────────────────────────── */}
        {searchQuery.trim().length >= 2 && (
          <div className="mt-3.5 pt-3 border-t border-gray-100 space-y-2.5">
            {isSearching ? (
              <div className="flex items-center justify-center py-6 text-xs text-gray-400 gap-2">
                <svg
                  className="w-4 h-4 animate-spin text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v4" />
                </svg>
                <span>Searching attendees...</span>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-5 text-xs text-gray-400">
                No attendees found matching &quot;{searchQuery}&quot;
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {searchResults.map((student) => {
                  const hasNfc = student.purchasedNfc && student.nfcIssued;
                  const needsHandover = student.purchasedNfc && !student.nfcIssued;

                  return (
                    <div
                      key={student.id}
                      className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 hover:bg-gray-50 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-gray-900">
                              {student.fullName}
                            </span>
                            {hasNfc ? (
                              <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
                                NFC Active
                              </span>
                            ) : needsHandover ? (
                              <span className="text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                                Awaiting Tag
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200 px-1.5 py-0.5 rounded">
                                QR Only
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{student.email}</p>
                        </div>

                        {needsHandover && (
                          <button
                            onClick={() => handleManualIssueTag(student.id, student.checkInToken)}
                            disabled={actionStatus?.id === student.id && actionStatus.loading}
                            className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition"
                          >
                            {actionStatus?.id === student.id && actionStatus.loading
                              ? "Issuing..."
                              : "Issue NFC"}
                          </button>
                        )}
                      </div>

                      {/* Ticket rows for this student */}
                      <div className="mt-2.5 pt-2 border-t border-gray-200/60 space-y-1.5">
                        {student.tickets.length === 0 ? (
                          <p className="text-[11px] text-gray-400 italic">
                            No tickets for your events
                          </p>
                        ) : (
                          student.tickets.map((t) => {
                            const isThisTicketLoading =
                              actionStatus?.id === t.ticketId && actionStatus.loading;

                            return (
                              <div
                                key={t.ticketId}
                                className="flex items-center justify-between gap-2 text-xs bg-white rounded-lg px-2.5 py-1.5 border border-gray-200/70"
                              >
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-800 truncate">
                                    {t.eventTitle}
                                  </p>
                                  <p className="text-[10px] text-gray-400">
                                    {new Date(t.eventDateTime).toLocaleDateString()}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {t.isCheckedIn ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                      <svg
                                        className="w-3 h-3 text-emerald-600"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2.5}
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                      Checked In
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleManualCheckIn(t.ticketId)}
                                      disabled={isThisTicketLoading}
                                      className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition shadow-xs"
                                    >
                                      {isThisTicketLoading ? "Checking in..." : "Check In"}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {actionStatus?.id === student.id && actionStatus.error && (
                        <p className="text-[11px] text-red-600 mt-1.5">{actionStatus.error}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 3. Quick Modal: Select Event to Scan ───────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Select Event to Scan</h3>
                <p className="text-xs text-gray-500">
                  Choose which event entrance to operate
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {events.map((e) => {
                const eventDate = new Date(e.dateTime);
                const isToday =
                  eventDate.toDateString() === new Date().toDateString();

                return (
                  <Link
                    key={e.id}
                    href={`/scan?event=${e.id}`}
                    onClick={() => setIsModalOpen(false)}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 bg-gray-50/70 hover:border-indigo-200 hover:bg-indigo-50/50 transition group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-900 truncate">
                          {e.title}
                        </p>
                        {isToday && (
                          <span className="text-[10px] font-bold uppercase bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded">
                            Today
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {eventDate.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · {e.location || "Online"} · {e.totalRegistered} registered
                      </p>
                    </div>

                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                      <svg
                        className="w-4 h-4"
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
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="pt-1">
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
