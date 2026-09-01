"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  searchStudentsForDashboardAction,
  manualCheckInAction,
  manualIssueNfcAction,
  issueGuestWalkUpAction,
  type StudentSearchResult,
} from "./actions";
import { markNfcIssuedLocally } from "@/lib/idb";

interface EventSummary {
  id: string;
  title: string;
  dateTime: Date;
  location: string | null;
  totalRegistered: number;
  price?: number;
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
  const [nfcAvailable, setNfcAvailable] = useState(false);

  // Walk-Up Sales Modal State (Scenario B)
  const [isWalkUpModalOpen, setIsWalkUpModalOpen] = useState(false);
  const [walkUpEventId, setWalkUpEventId] = useState("");
  const [walkUpGuestName, setWalkUpGuestName] = useState("");
  const [walkUpStep, setWalkUpStep] = useState<"details" | "tap" | "success">("details");
  const [isProcessingWalkUp, setIsProcessingWalkUp] = useState(false);
  const [walkUpError, setWalkUpError] = useState<string | null>(null);
  const [walkUpResultData, setWalkUpResultData] = useState<{
    token: string;
    fullName: string;
    eventTitle: string;
    eventPrice: number;
  } | null>(null);

  // NFC Tap Programming Modal State
  const [nfcModalStudent, setNfcModalStudent] = useState<{
    id: string;
    fullName: string;
    email: string;
    token: string;
  } | null>(null);
  const [isWritingNfc, setIsWritingNfc] = useState(false);
  const [nfcWriteSuccess, setNfcWriteSuccess] = useState(false);
  const [nfcWriteError, setNfcWriteError] = useState<string | null>(null);

  const [actionStatus, setActionStatus] = useState<{
    id: string;
    type: "checkin" | "issue";
    loading: boolean;
    error?: string;
  } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Detect Web NFC support on mount
  useEffect(() => {
    setNfcAvailable("NDEFReader" in window);
  }, []);

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

  // ── Open NFC Tap Modal for a Student ──────────────────────────────────────
  const handleOpenNfcTapModal = (student: StudentSearchResult) => {
    setNfcModalStudent({
      id: student.id,
      fullName: student.fullName,
      email: student.email,
      token: student.checkInToken,
    });
    setNfcWriteSuccess(false);
    setNfcWriteError(null);
  };

  // ── Perform Physical NFC Tag Write & Handover ──────────────────────────────
  const handleExecuteNfcWrite = async () => {
    if (!nfcModalStudent) return;
    setIsWritingNfc(true);
    setNfcWriteError(null);

    try {
      if (nfcAvailable && "NDEFReader" in window) {
        const ndef = new window.NDEFReader();
        await ndef.write(nfcModalStudent.token);
      } else {
        // Fallback simulation for desktop / iOS browser testing
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Update local IndexedDB cache immediately
      await markNfcIssuedLocally(nfcModalStudent.token);

      // Execute Server Action transaction
      const res = await manualIssueNfcAction(nfcModalStudent.token);
      if (res.error) {
        setNfcWriteError(res.error);
        setIsWritingNfc(false);
        return;
      }

      // Update student row in local search results state
      setSearchResults((prev) =>
        prev.map((student) =>
          student.id === nfcModalStudent.id
            ? { ...student, nfcIssued: true, purchasedNfc: true }
            : student,
        ),
      );

      setNfcWriteSuccess(true);
      setTimeout(() => {
        setNfcModalStudent(null);
        setNfcWriteSuccess(false);
        setIsWritingNfc(false);
      }, 1500);
    } catch (err: unknown) {
      setNfcWriteError((err as Error).message || String(err));
      setIsWritingNfc(false);
    }
  };

  // ── Open Walk-Up Sale Modal ──────────────────────────────────────────────
  const handleOpenWalkUpModal = () => {
    const defaultEventId = targetEvents[0]?.id || events[0]?.id || "";
    setWalkUpEventId(defaultEventId);
    setWalkUpGuestName("");
    setWalkUpStep("details");
    setWalkUpError(null);
    setWalkUpResultData(null);
    setIsWalkUpModalOpen(true);
  };

  // ── Generate Guest Ticket & Proceed to NFC Tap ───────────────────────────
  const handleGenerateWalkUpTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkUpEventId) {
      setWalkUpError("Please select an event");
      return;
    }
    setIsProcessingWalkUp(true);
    setWalkUpError(null);

    try {
      const res = await issueGuestWalkUpAction({
        eventId: walkUpEventId,
        guestName: walkUpGuestName,
      });

      if (res.error || !res.token) {
        setWalkUpError(res.error || "Failed to create guest ticket");
        setIsProcessingWalkUp(false);
        return;
      }

      setWalkUpResultData({
        token: res.token,
        fullName: res.fullName || "Guest Attendee",
        eventTitle: res.eventTitle || "Event",
        eventPrice: res.eventPrice || 0,
      });
      setWalkUpStep("tap");
      setIsProcessingWalkUp(false);
    } catch (err: unknown) {
      setWalkUpError((err as Error).message || String(err));
      setIsProcessingWalkUp(false);
    }
  };

  // ── Write Blank Tag for Walk-Up Guest ────────────────────────────────────
  const handleExecuteWalkUpNfcWrite = async () => {
    if (!walkUpResultData) return;
    setIsProcessingWalkUp(true);
    setWalkUpError(null);

    try {
      if (nfcAvailable && "NDEFReader" in window) {
        const ndef = new window.NDEFReader();
        await ndef.write(walkUpResultData.token);
      } else {
        // Fallback simulation for desktop / iOS browser testing
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Update local IndexedDB cache immediately
      await markNfcIssuedLocally(walkUpResultData.token);

      setWalkUpStep("success");
      setIsProcessingWalkUp(false);
      setTimeout(() => {
        setIsWalkUpModalOpen(false);
        setWalkUpStep("details");
        setWalkUpResultData(null);
      }, 1800);
    } catch (err: unknown) {
      setWalkUpError((err as Error).message || String(err));
      setIsProcessingWalkUp(false);
    }
  };

  return (
    <section className="mb-8 space-y-4">
      {/* ── 1. Primary Action Targets: Scanner + Walk-Up Sales ────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Button A: Open Scanner */}
        <button
          onClick={handleOpenScanner}
          className="group relative flex items-center justify-between gap-3 rounded-2xl bg-indigo-600 px-5 py-4 text-white shadow-md hover:bg-indigo-700 active:scale-[0.99] transition text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
              <svg
                className="w-5 h-5 text-white"
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
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight">
                  Open Scanner
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-1.5 py-0.2 rounded-full">
                  Door
                </span>
              </div>
              <p className="text-xs text-indigo-100 mt-0.5 truncate">
                {targetEvents.length === 1
                  ? `${targetEvents[0].title}`
                  : `${targetEvents.length} events active`}
              </p>
            </div>
          </div>

          <div className="text-white/70 group-hover:text-white group-hover:translate-x-0.5 transition flex-shrink-0">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        {/* Button B: Walk-Up Sales */}
        <button
          onClick={handleOpenWalkUpModal}
          className="group relative flex items-center justify-between gap-3 rounded-2xl bg-white border border-gray-200 px-5 py-4 text-gray-900 shadow-xs hover:border-emerald-300 hover:bg-emerald-50/40 active:scale-[0.99] transition text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-gray-900">
                  Walk-Up Sale
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                  Cash + NFC
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                Sell ticket & issue pass at door
              </p>
            </div>
          </div>

          <div className="text-gray-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition flex-shrink-0">
            <svg
              className="w-5 h-5"
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
                            onClick={() => handleOpenNfcTapModal(student)}
                            className="flex-shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 active:scale-95 transition flex items-center gap-1.5 shadow-xs"
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                            >
                              <circle cx="12" cy="12" r="9" />
                              <circle cx="12" cy="12" r="5" />
                              <circle cx="12" cy="12" r="1.5" fill="currentColor" strokeWidth={0} />
                            </svg>
                            <span>Issue NFC (Tap)</span>
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

      {/* ── 4. NFC Tap Programming Modal (Phone Handover Flow) ─────────── */}
      {nfcModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-gray-200 p-5 shadow-2xl space-y-4">
            {nfcWriteSuccess ? (
              <div className="text-center py-4 space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="text-base font-bold text-gray-900">Tag Programmed & Linked!</h4>
                <p className="text-xs text-gray-500">
                  {nfcModalStudent.fullName}&apos;s physical pass is now ready for tap-in.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-bold text-gray-900">Issue Physical NFC Tag</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Programming tag for <span className="font-semibold text-gray-800">{nfcModalStudent.fullName}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setNfcModalStudent(null)}
                    disabled={isWritingNfc}
                    className="rounded-lg p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
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

                <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4 flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <svg
                      className={`h-6 w-6 ${isWritingNfc ? "animate-pulse" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <circle cx="12" cy="12" r="5" />
                      <circle cx="12" cy="12" r="1.5" fill="currentColor" strokeWidth={0} />
                    </svg>
                  </div>
                  <div className="text-xs text-indigo-950 min-w-0">
                    <p className="font-bold text-sm">
                      {isWritingNfc ? "Hold blank tag to phone..." : "Ready to Tap"}
                    </p>
                    <p className="text-[11px] text-indigo-700 mt-0.5">
                      {nfcAvailable ? "Web NFC Enabled" : "Simulation Mode (Desktop/iOS)"}
                    </p>
                  </div>
                </div>

                {nfcWriteError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    {nfcWriteError}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setNfcModalStudent(null)}
                    disabled={isWritingNfc}
                    className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteNfcWrite}
                    disabled={isWritingNfc}
                    className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {isWritingNfc ? (
                      <>
                        <svg
                          className="w-3.5 h-3.5 animate-spin"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                        >
                          <circle cx="12" cy="12" r="9" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v4" />
                        </svg>
                        <span>Writing Tag...</span>
                      </>
                    ) : (
                      <span>Tap Tag to Issue</span>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── 5. Walk-Up Sales Modal (Scenario B: Guest / No Account) ───── */}
      {isWalkUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-gray-200 p-5 shadow-2xl space-y-4">
            {walkUpStep === "success" ? (
              <div className="text-center py-5 space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="text-base font-bold text-gray-900">
                  Guest Ticket & NFC Pass Issued!
                </h4>
                <p className="text-xs text-gray-500">
                  {walkUpResultData?.fullName} has been checked in to{" "}
                  <span className="font-semibold text-gray-700">
                    {walkUpResultData?.eventTitle}
                  </span>
                  .
                </p>
              </div>
            ) : walkUpStep === "tap" && walkUpResultData ? (
              /* Step 2: NFC Tap Flow */
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-bold text-gray-900">Program Guest NFC Pass</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Linking tag for{" "}
                      <span className="font-semibold text-gray-800">
                        {walkUpResultData.fullName}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => setIsWalkUpModalOpen(false)}
                    disabled={isProcessingWalkUp}
                    className="rounded-lg p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
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

                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <svg
                      className={`h-6 w-6 ${isProcessingWalkUp ? "animate-pulse" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <circle cx="12" cy="12" r="5" />
                      <circle cx="12" cy="12" r="1.5" fill="currentColor" strokeWidth={0} />
                    </svg>
                  </div>
                  <div className="text-xs text-emerald-950 min-w-0">
                    <p className="font-bold text-sm">
                      {isProcessingWalkUp
                        ? "Hold blank tag to phone..."
                        : "Ready to Tap Physical Tag"}
                    </p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      {nfcAvailable ? "Web NFC Enabled" : "Simulation Mode (Desktop/iOS)"}
                    </p>
                  </div>
                </div>

                {walkUpError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    {walkUpError}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsWalkUpModalOpen(false)}
                    disabled={isProcessingWalkUp}
                    className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteWalkUpNfcWrite}
                    disabled={isProcessingWalkUp}
                    className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {isProcessingWalkUp ? (
                      <>
                        <svg
                          className="w-3.5 h-3.5 animate-spin"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                        >
                          <circle cx="12" cy="12" r="9" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v4" />
                        </svg>
                        <span>Writing Tag...</span>
                      </>
                    ) : (
                      <span>Tap Tag to Issue</span>
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* Step 1: Walk-Up Details */
              <form onSubmit={handleGenerateWalkUpTicket} className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-bold text-gray-900">Walk-Up Ticket Sale</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Issue guest pass & program physical tag at door
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsWalkUpModalOpen(false)}
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

                {/* Event Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                    Target Event
                  </label>
                  <select
                    value={walkUpEventId}
                    onChange={(e) => setWalkUpEventId(e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                  >
                    {events.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.title} ({e.price ? `${e.price.toLocaleString()} MMK` : "Free"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Guest Name (Optional) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                    Attendee Name <span className="font-normal text-gray-400 normal-case">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={walkUpGuestName}
                    onChange={(e) => setWalkUpGuestName(e.target.value)}
                    placeholder="Leave blank for Anonymous"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                  />
                </div>

                {/* Price to Collect Banner */}
                {(() => {
                  const selectedEvent = events.find((e) => e.id === walkUpEventId);
                  const price = selectedEvent?.price ?? 0;
                  return (
                    <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 p-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-emerald-900">Cash to Collect</p>
                        <p className="text-[11px] text-emerald-700">Cash box reconciliation</p>
                      </div>
                      <span className="text-base font-bold text-emerald-950 font-mono">
                        {price > 0 ? `${price.toLocaleString()} MMK` : "Free"}
                      </span>
                    </div>
                  );
                })()}

                {walkUpError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    {walkUpError}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsWalkUpModalOpen(false)}
                    disabled={isProcessingWalkUp}
                    className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingWalkUp}
                    className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {isProcessingWalkUp ? (
                      <span>Generating Ticket...</span>
                    ) : (
                      <span>Collect Cash & Issue Tag</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
