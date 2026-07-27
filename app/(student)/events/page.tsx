import { db } from "@/utils/db";
import { events, tickets } from "@/drizzle/schema";
import { count, eq, gte } from "drizzle-orm";
import Link from "next/link";

export const metadata = { title: "Events" };

export default async function EventsPage() {
  const now = new Date();

  const upcomingEvents = await db
    .select({
      id: events.id,
      title: events.title,
      dateTime: events.dateTime,
      location: events.location,
      maxCapacity: events.maxCapacity,
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
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Events</h1>
      {upcomingEvents.length === 0 && (
        <p className="text-sm text-gray-400">No upcoming events.</p>
      )}
      <ul className="space-y-3">
        {upcomingEvents.map((event) => {
          const taken = countMap[event.id] ?? 0;
          const spots = event.maxCapacity - taken;
          return (
            <li key={event.id}>
              <Link
                href={`/events/${event.id}`}
                className="block border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition"
              >
                <p className="font-medium text-gray-900">{event.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(event.dateTime).toLocaleString()} · {event.location}
                </p>
                <p className={`text-xs mt-1 font-medium ${spots > 0 ? "text-green-600" : "text-red-500"}`}>
                  {spots > 0 ? `${spots} spots left` : "Full"}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
