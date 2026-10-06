import { cookies } from "next/headers";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { events, tickets, profiles } from "@/drizzle/schema";
import { count, eq, asc } from "drizzle-orm";
import HomepageNav from "./homepage-nav";

export const metadata = {
  title: "CEDIS | Campus Event & Digital Identification System",
  description:
    "Myanmar's Premier Campus Events & Ticketing Platform. Connect organizers and students with seamless event discovery, universal digital passes, and instant offline door scanning.",
};

export default async function HomePage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userProfile = null;
  if (user) {
    const [p] = await db
      .select({
        id: profiles.id,
        role: profiles.role,
        fullName: profiles.fullName,
      })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);
    userProfile = p || null;
  }

  // Fetch upcoming and today's events for the "Latest Events" section
  const allEvents = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      dateTime: events.dateTime,
      location: events.location,
      maxCapacity: events.maxCapacity,
      price: events.price,
    })
    .from(events)
    .orderBy(asc(events.dateTime))
    .limit(6);

  // Get ticket counts for each event to show available spots
  const ticketCounts = await db
    .select({
      eventId: tickets.eventId,
      total: count(),
    })
    .from(tickets)
    .groupBy(tickets.eventId);

  const countsMap = Object.fromEntries(
    ticketCounts.map((t) => [t.eventId, t.total]),
  );

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans selection:bg-purple-100 selection:text-purple-900">
      {/* ── Top Announcement Bar ─────────────────────────────────────────── */}
      {/* <div className="bg-gradient-to-r from-[#4A1D96] via-[#623795] to-[#DF2490] text-white px-4 py-2 text-center text-xs font-bold font-dingos-bold tracking-wide">
        <span>
          🎓 University Final Year Capstone Project Showcase • Live Demo in Main
          Lobby • 100% Offline-First
        </span>
      </div> */}

      {/* ── Navigation Header ────────────────────────────────────────────── */}
      <HomepageNav
        isLoggedIn={Boolean(user)}
        userRole={userProfile?.role}
        userName={userProfile?.fullName}
      />

      {/* ── Hero Section (Eventickat Styled) ──────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1e0a3c] via-[#3b126d] to-[#623795] text-white pt-16 pb-20 sm:pt-24 sm:pb-32 px-4 sm:px-6 lg:px-8">
        {/* Ambient background blur circles */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 sm:w-[600px] sm:h-[600px] bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10 text-center space-y-6 sm:space-y-8">
          {/* Badge Pill */}
          {/* <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-bold tracking-wide text-purple-200">
            <span className="w-2 h-2 rounded-full bg-[#DF2490] animate-ping" />
            <span>Myanmar&apos;s Premier Campus Ticketing Platform</span>
          </div> */}

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight font-dingos-bold max-w-4xl mx-auto leading-tight sm:leading-none">
            Discover, Book &amp; Experience{" "}
            <span className="bg-gradient-to-r from-purple-200 via-pink-300 to-white bg-clip-text text-transparent">
              Campus Events
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-xl lg:text-2xl text-purple-100/90 max-w-3xl mx-auto leading-relaxed font-normal">
            Connecting university event organizers with students through
            seamless event discovery, universal digital passes, and instant
            offline door scanning.
          </p>

          {/* Call to action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Link
              href="/events"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-full bg-white text-[#623795] hover:bg-purple-50 px-8 py-4 text-base sm:text-lg font-bold shadow-lg shadow-purple-950/30 hover:scale-105 active:scale-95 transition-all font-dingos-bold"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.2}
              >
                <circle cx="11" cy="11" r="8" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35"
                />
              </svg>
              <span>Discover Events</span>
            </Link>

            <Link
              href={userProfile?.role === "organizer" ? "/dashboard" : "/login"}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/80 bg-white/5 hover:bg-white/15 text-white px-8 py-4 text-base sm:text-lg font-bold backdrop-blur-xs hover:scale-105 active:scale-95 transition-all font-dingos-bold"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>List Your Event</span>
            </Link>
          </div>

          {/* Feature Highlights Pill Row */}
          <div className="pt-6 sm:pt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-purple-200/80 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>100% Offline-First</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>1 Universal QR Pass</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Tap Web NFC Smart Card</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Zero Entrance Drops</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee Section (Signature Eventickat Feature) ──────────────────── */}
      {/* <div className="bg-[#522588] text-purple-200 overflow-hidden py-3.5 border-y border-purple-800/40 select-none">
        <div className="whitespace-nowrap flex gap-12 font-dingos-bold text-sm sm:text-base tracking-widest uppercase opacity-90 animate-pulse">
          <span>
            Discover • RSVP • Experience • Connect • Celebrate • Tap NFC •
            Offline Check-in • Digital ID
          </span>
          <span>
            Discover • RSVP • Experience • Connect • Celebrate • Tap NFC •
            Offline Check-in • Digital ID
          </span>
          <span>
            Discover • RSVP • Experience • Connect • Celebrate • Tap NFC •
            Offline Check-in • Digital ID
          </span>
        </div>
      </div> */}

      {/* ── Latest Events Section (Dynamic Database Data) ─────────────────── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center space-y-3 mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-gray-900 font-dingos-bold">
            Latest Campus Events
          </h2>
          <p className="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto">
            Stay ahead of the curve, discover what&apos;s happening now.
          </p>
        </div>

        {allEvents.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-3xl border border-gray-100 p-8">
            <p className="text-gray-500 font-medium">
              No campus events currently scheduled. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {allEvents.map((event) => {
              const dt = new Date(event.dateTime);
              const registered = countsMap[event.id] ?? 0;
              const spotsLeft = Math.max(0, event.maxCapacity - registered);
              const isFree = !event.price || event.price === 0;

              return (
                <div
                  key={event.id}
                  className="group bg-white rounded-3xl border border-gray-200/90 shadow-sm hover:shadow-xl hover:border-purple-200 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-6 sm:p-7 space-y-4">
                    {/* Top Row: Date Pill & Price */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-[#623795] text-xs font-bold font-dingos-bold border border-purple-100">
                        <svg
                          className="w-3.5 h-3.5 text-[#623795]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                        >
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <path d="M16 2v4M8 2v4M3 10h18" />
                        </svg>
                        <span>
                          {dt.toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          •{" "}
                          {dt.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </span>

                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full font-dingos-bold ${
                          isFree
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-pink-50 text-pink-800 border border-pink-200"
                        }`}
                      >
                        {isFree
                          ? "Free"
                          : `${event.price.toLocaleString()} MMK`}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-[#623795] transition-colors font-dingos-bold line-clamp-2">
                      {event.title}
                    </h3>

                    {/* Venue / Location */}
                    <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-1.5 line-clamp-1">
                      <svg
                        className="w-4 h-4 text-gray-400 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span>{event.location || "Campus Venue"}</span>
                    </p>

                    {/* Capacity and Spots Left */}
                    <div className="pt-2 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100">
                      <span>
                        Capacity:{" "}
                        <strong className="text-gray-900 font-bold">
                          {event.maxCapacity}
                        </strong>
                      </span>
                      <span>
                        Available:{" "}
                        <strong className="text-emerald-700 font-bold">
                          {spotsLeft} spots
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Card Bottom Button */}
                  <div className="p-4 sm:p-5 bg-gray-50/70 border-t border-gray-100">
                    <Link
                      href="/events"
                      className="w-full rounded-2xl bg-white hover:bg-[#623795] text-gray-800 hover:text-white border border-gray-200/80 hover:border-[#623795] py-2.5 text-xs sm:text-sm font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 font-dingos-bold active:scale-95"
                    >
                      <span>Get Digital Pass</span>
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
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* View All Events Button */}
        <div className="text-center mt-12 sm:mt-16">
          <Link
            href="/events"
            className="inline-flex items-center gap-2.5 rounded-full border-2 border-[#623795] text-[#623795] hover:bg-purple-50 px-8 py-3.5 text-sm sm:text-base font-bold transition-all font-dingos-bold active:scale-95 shadow-sm"
          >
            <span>View All Events</span>
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
        </div>
      </section>

      {/* ── What is CEDIS? (Platform Overview Section) ────────────────────── */}
      <section
        id="about"
        className="py-16 sm:py-24 bg-gray-50/70 border-y border-gray-100 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-7xl mx-auto space-y-12 sm:space-y-16">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-gray-900 font-dingos-bold">
              What is CEDIS?
            </h2>
            <p className="text-base sm:text-xl text-gray-600 max-w-3xl mx-auto">
              The comprehensive digital platform that revolutionizes how campus
              events are discovered, promoted, and attended in Myanmar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm space-y-4 text-center hover:border-purple-200 hover:shadow-md transition">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 text-[#623795] flex items-center justify-center mx-auto shadow-2xs">
                <svg
                  className="w-7 h-7"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 font-dingos-bold">
                Event Discovery
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Browse academic conferences, AI hackathons, esports tournaments,
                music nights, and design workshops across campus.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm space-y-4 text-center hover:border-purple-200 hover:shadow-md transition">
              <div className="w-14 h-14 rounded-2xl bg-pink-100 text-[#DF2490] flex items-center justify-center mx-auto shadow-2xs">
                <svg
                  className="w-7 h-7"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 font-dingos-bold">
                Universal Ticketing
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Instant digital passes with 1 single permanent student QR code
                and physical NFC contactless cards.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm space-y-4 text-center hover:border-purple-200 hover:shadow-md transition">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto shadow-2xs">
                <svg
                  className="w-7 h-7"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 font-dingos-bold">
                Door Management
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Sub-millisecond camera &amp; NFC check-in, duplicate protection,
                walk-up door cash ticketing, and audio chime alerts.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm space-y-4 text-center hover:border-purple-200 hover:shadow-md transition">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
                <svg
                  className="w-7 h-7"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <rect x="5" y="2" width="14" height="20" rx="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 font-dingos-bold">
                Offline-First PWA
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Runs entirely offline with local IndexedDB roster caching and
                automatic Serwist background synchronization.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── For Event Attendees (Students) ────────────────────────────────── */}
      <section
        id="attendees"
        className="py-16 sm:py-24 bg-gradient-to-br from-[#4A1D96] to-[#623795] text-white px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-7xl mx-auto space-y-12 sm:space-y-16">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight font-dingos-bold">
              For Students &amp; Attendees
            </h2>
            <p className="text-base sm:text-xl text-purple-200 max-w-2xl mx-auto">
              Your frictionless gateway to unforgettable university experiences.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-7 sm:p-8 border border-white/15 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white text-[#623795] flex items-center justify-center shadow-xs">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path strokeLinecap="round" d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold font-dingos-bold">
                Smart Discovery &amp; Filters
              </h3>
              <p className="text-purple-100/90 text-sm sm:text-base leading-relaxed">
                Find events by title, date, location, and free/paid options.
                Instantly check remaining capacity and reserved seats.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-7 sm:p-8 border border-white/15 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white text-[#623795] flex items-center justify-center shadow-xs">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <rect x="5" y="2" width="14" height="20" rx="3" />
                  <line
                    x1="12"
                    y1="18"
                    x2="12.01"
                    y2="18"
                    strokeLinecap="round"
                    strokeWidth={2.5}
                  />
                  <line x1="9" y1="6" x2="15" y2="6" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold font-dingos-bold">
                Universal Digital ID Pass
              </h3>
              <p className="text-purple-100/90 text-sm sm:text-base leading-relaxed">
                One permanent QR code for all your campus events. No more
                printing paper PDFs or fumbling through multiple ticket emails.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-7 sm:p-8 border border-white/15 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white text-[#623795] flex items-center justify-center shadow-xs">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                  <line x1="6" y1="15" x2="10" y2="15" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold font-dingos-bold">
                Physical NFC Smart Card
              </h3>
              <p className="text-purple-100/90 text-sm sm:text-base leading-relaxed">
                Optionally pair a physical NFC student badge. Tap once at the
                door entrance for contactless check-in with zero battery
                worries.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-7 sm:p-8 border border-white/15 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white text-[#623795] flex items-center justify-center shadow-xs">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <rect x="8" y="2" width="8" height="4" rx="1" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m9 14 2 2 4-4"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold font-dingos-bold">
                Real-Time Attendance Ledger
              </h3>
              <p className="text-purple-100/90 text-sm sm:text-base leading-relaxed">
                Track your active RSVPs, past attended summits, and verified
                entry timestamps directly from your student portal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── For Event Organizers ─────────────────────────────────────────── */}
      <section
        id="organizers"
        className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full"
      >
        <div className="text-center space-y-3 mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-gray-900 font-dingos-bold">
            For Event Organizers
          </h2>
          <p className="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto">
            Everything you need to create, promote, and manage high-density
            campus events.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Pillar 1 */}
          <div className="bg-white rounded-3xl p-7 sm:p-8 border border-gray-200/90 shadow-sm space-y-4 hover:border-purple-200 transition">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 text-[#623795] flex items-center justify-center">
              <svg
                className="w-7 h-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 font-dingos-bold">
              Easy Event Creation
            </h3>
            <ul className="space-y-2.5 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="text-[#623795] font-bold">✓</span>
                <span>Fast event publishing setup</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#623795] font-bold">✓</span>
                <span>Free or paid ticket pricing (MMK)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#623795] font-bold">✓</span>
                <span>Capacity limits &amp; venue mapping</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#623795] font-bold">✓</span>
                <span>Markdown event descriptions</span>
              </li>
            </ul>
          </div>

          {/* Pillar 2 */}
          <div className="bg-white rounded-3xl p-7 sm:p-8 border border-gray-200/90 shadow-sm space-y-4 hover:border-purple-200 transition">
            <div className="w-14 h-14 rounded-2xl bg-pink-100 text-[#DF2490] flex items-center justify-center">
              <svg
                className="w-7 h-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <circle cx="17.5" cy="17.5" r="2.5" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 font-dingos-bold">
              High-Speed Door Scanner
            </h3>
            <ul className="space-y-2.5 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="text-[#DF2490] font-bold">✓</span>
                <span>Camera barcode &amp; Web NFC tap scanning</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#DF2490] font-bold">✓</span>
                <span>Web Audio API synthesized chimes &amp; haptics</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#DF2490] font-bold">✓</span>
                <span>Instant walk-up door cash ticketing</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#DF2490] font-bold">✓</span>
                <span>Zero-drop offline IndexedDB sync</span>
              </li>
            </ul>
          </div>

          {/* Pillar 3 */}
          <div className="bg-white rounded-3xl p-7 sm:p-8 border border-gray-200/90 shadow-sm space-y-4 hover:border-purple-200 transition">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <svg
                className="w-7 h-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 font-dingos-bold">
              Real-Time Command Stats
            </h3>
            <ul className="space-y-2.5 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="text-indigo-600 font-bold">✓</span>
                <span>Live attendee admission counter</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-indigo-600 font-bold">✓</span>
                <span>Walk-up revenue collected tracking</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-indigo-600 font-bold">✓</span>
                <span>NFC blank tag inventory forecasting</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-indigo-600 font-bold">✓</span>
                <span>1-click CSV guest list exports</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Key Platform Metrics Bar ──────────────────────────────────────── */}
      <section className="py-12 sm:py-16 bg-[#623795] text-white px-4 sm:px-6 lg:px-8 select-none">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="space-y-1">
            <div className="text-4xl sm:text-6xl font-extrabold font-bebas tracking-wide">
              100%
            </div>
            <div className="text-xs sm:text-sm text-purple-200 uppercase font-bold font-dingos-bold">
              Offline Capable
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-4xl sm:text-6xl font-extrabold font-bebas tracking-wide">
              &lt; 1s
            </div>
            <div className="text-xs sm:text-sm text-purple-200 uppercase font-bold font-dingos-bold">
              Door Verification
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-4xl sm:text-6xl font-extrabold font-bebas tracking-wide">
              1
            </div>
            <div className="text-xs sm:text-sm text-purple-200 uppercase font-bold font-dingos-bold">
              Universal ID Per Student
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-4xl sm:text-6xl font-extrabold font-bebas tracking-wide">
              0
            </div>
            <div className="text-xs sm:text-sm text-purple-200 uppercase font-bold font-dingos-bold">
              Paper Ticket Waste
            </div>
          </div>
        </div>
      </section>

      {/* ── Why Choose CEDIS? ─────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center space-y-3 mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-gray-900 font-dingos-bold">
            Why Choose CEDIS?
          </h2>
          <p className="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto">
            Architected specifically for university environments and
            high-density campus doors.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gray-50/80 rounded-3xl p-6 border border-gray-100 flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-sm mt-0.5">
              ✓
            </div>
            <div>
              <h4 className="font-bold text-gray-900 font-dingos-bold text-base mb-1">
                Zero-Drop Offline Sync
              </h4>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                Door check-in continues uninterrupted even during complete
                campus Wi-Fi outages.
              </p>
            </div>
          </div>

          <div className="bg-gray-50/80 rounded-3xl p-6 border border-gray-100 flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-sm mt-0.5">
              ✓
            </div>
            <div>
              <h4 className="font-bold text-gray-900 font-dingos-bold text-base mb-1">
                Physical NFC Smart Cards
              </h4>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                Hand over physical NFC cards at the door; organizers write
                tokens in 1 tap via Web NFC.
              </p>
            </div>
          </div>

          <div className="bg-gray-50/80 rounded-3xl p-6 border border-gray-100 flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-sm mt-0.5">
              ✓
            </div>
            <div>
              <h4 className="font-bold text-gray-900 font-dingos-bold text-base mb-1">
                Universal Identity Model
              </h4>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                Students keep 1 permanent QR code. Rotating physical cards
                preserves all event tickets.
              </p>
            </div>
          </div>

          <div className="bg-gray-50/80 rounded-3xl p-6 border border-gray-100 flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-sm mt-0.5">
              ✓
            </div>
            <div>
              <h4 className="font-bold text-gray-900 font-dingos-bold text-base mb-1">
                Walk-Up Door Cash Sales
              </h4>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                Admit non-registered students instantly at the door with
                automatic cash accounting.
              </p>
            </div>
          </div>

          <div className="bg-gray-50/80 rounded-3xl p-6 border border-gray-100 flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-sm mt-0.5">
              ✓
            </div>
            <div>
              <h4 className="font-bold text-gray-900 font-dingos-bold text-base mb-1">
                Audio-Visual Verification
              </h4>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                Synthesized Web Audio API chimes provide instant feedback for
                valid, duplicate, or invalid entries.
              </p>
            </div>
          </div>

          <div className="bg-gray-50/80 rounded-3xl p-6 border border-gray-100 flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-sm mt-0.5">
              ✓
            </div>
            <div>
              <h4 className="font-bold text-gray-900 font-dingos-bold text-base mb-1">
                Free for Campus Clubs
              </h4>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                Free events cost 0 MMK with unlimited RSVP quotas for academic
                activities and student unions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Ready to Get Started? (CTA Section) ───────────────────────────── */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="rounded-3xl bg-gradient-to-r from-[#4A1D96] via-[#623795] to-[#DF2490] p-8 sm:p-14 text-center text-white space-y-6 shadow-xl relative overflow-hidden">
          <div className="max-w-3xl mx-auto space-y-4 relative z-10">
            <h2 className="text-3xl sm:text-5xl font-bold font-dingos-bold tracking-tight">
              Ready to Get Started?
            </h2>
            <p className="text-base sm:text-xl text-purple-100">
              Join university organizers and students who trust CEDIS for
              seamless campus event access.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <Link
                href="/events"
                className="rounded-full bg-white text-[#623795] hover:bg-purple-50 px-8 py-3.5 text-sm sm:text-base font-bold shadow-md hover:scale-105 active:scale-95 transition font-dingos-bold"
              >
                Browse Events
              </Link>
              <Link
                href="/login"
                className="rounded-full border-2 border-white text-white hover:bg-white/10 px-8 py-3.5 text-sm sm:text-base font-bold hover:scale-105 active:scale-95 transition font-dingos-bold"
              >
                Sign In to Portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-gray-50 text-gray-600 py-12 px-4 sm:px-6 lg:px-8 text-xs sm:text-sm">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1 */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
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
              <span className="font-dingos-bold text-lg text-gray-900 tracking-tight">
                CEDIS
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Campus Event &amp; Digital Identification System. Delivering
              offline-first entrance verification and universal identity access.
            </p>
          </div>

          {/* Col 2 */}
          <div className="space-y-2">
            <h5 className="font-bold text-gray-900 font-dingos-bold text-xs uppercase tracking-wider">
              Students
            </h5>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/events"
                  className="hover:text-[#623795] transition"
                >
                  Campus Events Catalog
                </Link>
              </li>
              <li>
                <Link href="/my-id" className="hover:text-[#623795] transition">
                  My Digital QR Pass
                </Link>
              </li>
              <li>
                <Link
                  href="/my-tickets"
                  className="hover:text-[#623795] transition"
                >
                  My Registered Tickets
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-2">
            <h5 className="font-bold text-gray-900 font-dingos-bold text-xs uppercase tracking-wider">
              Organizers
            </h5>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/dashboard"
                  className="hover:text-[#623795] transition"
                >
                  Organizer Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/events"
                  className="hover:text-[#623795] transition"
                >
                  Door Scanner Access
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#623795] transition">
                  Organizer Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4 */}
          <div className="space-y-2">
            <h5 className="font-bold text-gray-900 font-dingos-bold text-xs uppercase tracking-wider">
              Accepted Entrance
            </h5>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-[11px] font-bold text-gray-700">
                Universal QR
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-[11px] font-bold text-gray-700">
                NFC Smart Card
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-[11px] font-bold text-gray-700">
                Cash at Door
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-[11px] font-bold text-gray-700">
                MMQR
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto border-t border-gray-200/80 mt-10 pt-6 text-center text-xs text-gray-500">
          <p>
            © 2026 CEDIS — Built with Next.js 16, Supabase, Drizzle ORM, and
            Serwist PWA.
          </p>
        </div>
      </footer>
    </div>
  );
}
