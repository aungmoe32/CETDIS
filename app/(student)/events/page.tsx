import { db } from "@/utils/db";
import { events, tickets } from "@/drizzle/schema";
import { count, gte } from "drizzle-orm";
import Link from "next/link";

export const metadata = { title: "Campus Events · CETDIS" };

export default async function EventsPage() {
  const now = new Date();

  const upcomingEvents = await db
    .select({
      id: events.id,
      title: events.title,
      dateTime: events.dateTime,
      location: events.location,
      maxCapacity: events.maxCapacity,
      price: events.price,
    })
    .from(events)
    .where(gte(events.dateTime, now))
    .orderBy(events.dateTime);

  // Get ticket counts per event
  const ticketCounts = await db
    .select({ eventId: tickets.eventId, count: count() })
    .from(tickets)
    .groupBy(tickets.eventId);

  const countMap = Object.fromEntries(
    ticketCounts.map((t) => [t.eventId, t.count]),
  );

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
          <span>{upcomingEvents.length} Active</span>
        </span>
      </div>

      {/* Empty State */}
      {upcomingEvents.length === 0 && (
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

      {/* Event Cards List */}
      <ul className="space-y-3">
        {upcomingEvents.map((event) => {
          const taken = countMap[event.id] ?? 0;
          const spots = Math.max(0, event.maxCapacity - taken);
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
                          spots > 0 ? "text-emerald-600" : "text-red-500"
                        }`}
                      >
                        {spots > 0 ? `${spots} spots left` : "Full Capacity"}
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
