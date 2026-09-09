"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

export interface StudentTicketItem {
  ticketId: string;
  isCheckedIn: boolean;
  scannedAt: string | null;
  purchaseMethod: string;
  eventId: string;
  title: string;
  dateTime: string; // ISO string
  location: string | null;
  price: number;
}

interface Props {
  initialTickets: StudentTicketItem[];
  checkInToken: string;
}

type TabFilter = "all" | "upcoming" | "attended";

export default function MyTicketsClient({
  initialTickets,
  checkInToken,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicketForQr, setSelectedTicketForQr] =
    useState<StudentTicketItem | null>(null);

  const now = new Date();

  // Partition tickets
  const { upcomingList, attendedList } = useMemo(() => {
    const upcoming: StudentTicketItem[] = [];
    const attended: StudentTicketItem[] = [];

    initialTickets.forEach((ticket) => {
      const eventDate = new Date(ticket.dateTime);
      const isPastOrCheckedIn =
        ticket.isCheckedIn || eventDate.getTime() < now.getTime() - 86400000;

      if (isPastOrCheckedIn) {
        attended.push(ticket);
      } else {
        upcoming.push(ticket);
      }
    });

    return { upcomingList: upcoming, attendedList: attended };
  }, [initialTickets, now]);

  // Filter based on activeTab and searchQuery
  const filteredTickets = useMemo(() => {
    let list = initialTickets;
    if (activeTab === "upcoming") {
      list = upcomingList;
    } else if (activeTab === "attended") {
      list = attendedList;
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;

    return list.filter((t) => {
      const matchesTitle = t.title.toLowerCase().includes(q);
      const matchesLocation = t.location?.toLowerCase().includes(q) ?? false;
      return matchesTitle || matchesLocation;
    });
  }, [initialTickets, upcomingList, attendedList, activeTab, searchQuery]);

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5 pb-24 select-none">
      {/* Top Page Switcher Pills */}
      {/* <div className="flex items-center p-1 bg-gray-100/90 rounded-2xl border border-gray-200/80">
        <Link
          href="/events"
          className="flex-1 text-center py-2 rounded-xl text-xs font-medium text-gray-600 hover:text-gray-900 transition active:scale-95"
        >
          Explore Events
        </Link>
        <div className="flex-1 text-center py-2 rounded-xl text-xs font-bold bg-white text-gray-900 shadow-2xs font-dingos-bold">
          My Tickets ({initialTickets.length})
        </div>
      </div> */}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-dingos-bold tracking-tight">
            My Registered Events
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Your admission tickets &amp; entrance passes
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold font-dingos-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
          <span>{upcomingList.length} Upcoming</span>
        </span>
      </div>

      {/* Search & Tabs Controls */}
      {initialTickets.length > 0 && (
        <div className="space-y-3">
          {/* Search bar */}
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
                <line
                  x1="21"
                  y1="21"
                  x2="16.65"
                  y2="16.65"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your tickets by title or venue..."
              className="w-full rounded-2xl border border-gray-200/90 bg-white pl-10 pr-10 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition cursor-pointer"
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition tactile-btn shrink-0 cursor-pointer ${
                activeTab === "all"
                  ? "bg-indigo-600 text-white font-dingos-bold shadow-2xs"
                  : "bg-gray-100/90 text-gray-600 hover:bg-gray-200 font-medium"
              }`}
            >
              All Tickets ({initialTickets.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("upcoming")}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition tactile-btn shrink-0 cursor-pointer ${
                activeTab === "upcoming"
                  ? "bg-indigo-600 text-white font-dingos-bold shadow-2xs"
                  : "bg-gray-100/90 text-gray-600 hover:bg-gray-200 font-medium"
              }`}
            >
              Upcoming ({upcomingList.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("attended")}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition tactile-btn shrink-0 cursor-pointer ${
                activeTab === "attended"
                  ? "bg-indigo-600 text-white font-dingos-bold shadow-2xs"
                  : "bg-gray-100/90 text-gray-600 hover:bg-gray-200 font-medium"
              }`}
            >
              Attended / Past ({attendedList.length})
            </button>
          </div>
        </div>
      )}

      {/* Global Empty State (No tickets ever registered) */}
      {initialTickets.length === 0 && (
        <div className="rounded-3xl border border-gray-200/90 bg-white p-8 text-center shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-3xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center shadow-2xs">
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
              />
            </svg>
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-gray-900 font-dingos-bold">
              No Registered Events Yet
            </h3>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              You haven&apos;t RSVP&apos;d for any campus events yet. Explore
              upcoming gatherings to reserve your spot!
            </p>
          </div>
          <Link
            href="/events"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold font-dingos-bold transition active:scale-95 shadow-xs tactile-btn cursor-pointer"
          >
            <span>Browse Upcoming Events</span>
            <span>→</span>
          </Link>
        </div>
      )}

      {/* Filtered Empty State */}
      {initialTickets.length > 0 && filteredTickets.length === 0 && (
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
              <line
                x1="21"
                y1="21"
                x2="16.65"
                y2="16.65"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="text-sm font-bold text-gray-800 font-dingos-bold">
            No tickets found
          </p>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            {searchQuery
              ? `No registered events match "${searchQuery}".`
              : "No tickets match the selected tab filter."}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setActiveTab("all");
            }}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold font-dingos-bold transition tactile-btn cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Tickets List */}
      <ul className="space-y-3.5">
        {filteredTickets.map((ticket) => {
          const dateObj = new Date(ticket.dateTime);
          const monthStr = dateObj
            .toLocaleDateString("en-US", { month: "short" })
            .toUpperCase();
          const dayStr = dateObj.getDate();
          const timeStr = dateObj.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          const isToday = dateObj.toDateString() === now.toDateString();
          const isFree = !ticket.price || ticket.price === 0;

          return (
            <li key={ticket.ticketId}>
              <div className="group rounded-3xl border border-gray-200/90 bg-white p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all space-y-4">
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

                  {/* Ticket Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/events/${ticket.eventId}`}
                        className="font-bold text-gray-900 text-sm sm:text-base font-dingos-bold tracking-tight truncate hover:text-indigo-600 transition-colors"
                      >
                        {ticket.title}
                      </Link>
                      <span
                        className={`inline-flex items-center shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold font-dingos-bold ${
                          isFree
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        }`}
                      >
                        {isFree
                          ? "Free Entry"
                          : `${ticket.price.toLocaleString()} MMK`}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 truncate">
                      <span>{timeStr}</span>
                      <span>·</span>
                      <span className="truncate">
                        {ticket.location || "Campus Venue"}
                      </span>
                    </p>

                    {/* Status Pill */}
                    <div className="mt-2.5">
                      {ticket.isCheckedIn ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold font-dingos-bold">
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
                          <span>
                            Checked In
                            {ticket.scannedAt
                              ? ` at ${new Date(
                                  ticket.scannedAt,
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}`
                              : ""}
                          </span>
                        </span>
                      ) : isToday ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold font-dingos-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Today · Ready for Door Scan</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-bold font-dingos-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          <span>Registered</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ticket Card Footer Actions */}
                <div className="flex items-center justify-end pt-3 border-t border-gray-100 text-xs">
                  {/* <button
                    type="button"
                    onClick={() => setSelectedTicketForQr(ticket)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100/80 hover:bg-gray-200 text-gray-800 text-xs font-bold font-dingos-bold transition active:scale-95 tactile-btn"
                  >
                    <svg
                      className="w-3.5 h-3.5 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                      <circle
                        cx="17.5"
                        cy="17.5"
                        r="2.5"
                        fill="currentColor"
                        strokeWidth={0}
                      />
                    </svg>
                    <span>Show Pass QR</span>
                  </button> */}

                  <Link
                    href={`/events/${ticket.eventId}`}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors font-dingos-bold cursor-pointer"
                  >
                    <span>Event Details</span>
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
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Quick QR Pass Modal */}
      {selectedTicketForQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 select-none">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 relative overflow-hidden space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full font-dingos-bold">
                Door Pass
              </span>
              <button
                onClick={() => setSelectedTicketForQr(null)}
                className="rounded-full p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-1 text-left">
              <h3 className="text-base font-bold text-gray-900 font-dingos-bold truncate">
                {selectedTicketForQr.title}
              </h3>
              <p className="text-xs text-gray-500">
                {new Date(selectedTicketForQr.dateTime).toLocaleDateString([], {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}{" "}
                · {selectedTicketForQr.location || "Campus Venue"}
              </p>
            </div>

            {/* QR Code Container */}
            <div className="bg-gray-50/90 rounded-2xl p-4 border border-gray-200/80 shadow-2xs flex flex-col items-center justify-center">
              <div className="p-2 bg-white rounded-xl shadow-2xs">
                <QRCodeSVG
                  value={
                    checkInToken
                      ? `${typeof window !== "undefined" ? window.location.origin : ""}/scan/${checkInToken}`
                      : "cetdis-pass"
                  }
                  size={160}
                  level="H"
                />
              </div>
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold font-dingos-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Ready for Entrance Scan</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-400">
              Hold this QR pass or your physical NFC tag up to the door scanner.
            </p>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setSelectedTicketForQr(null)}
                className="w-full rounded-2xl border border-gray-200 py-2.5 text-xs font-bold font-dingos-bold text-gray-700 hover:bg-gray-50 transition tactile-btn cursor-pointer"
              >
                Close Pass
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
