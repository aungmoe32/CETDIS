import { db } from "@/utils/db";
import { events, tickets } from "@/drizzle/schema";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { count, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const myEvents = await db
    .select({
      id: events.id,
      title: events.title,
      dateTime: events.dateTime,
      location: events.location,
      maxCapacity: events.maxCapacity,
    })
    .from(events)
    .where(eq(events.organizerId, user.id))
    .orderBy(events.dateTime);

  const ticketCounts = await db
    .select({
      eventId: tickets.eventId,
      total: count(),
      checkedIn: sql<number>`count(*) filter (where ${tickets.isCheckedIn})`.mapWith(Number),
    })
    .from(tickets)
    .groupBy(tickets.eventId);

  const statsMap = Object.fromEntries(
    ticketCounts.map((t) => [t.eventId, t]),
  );

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Your Events</h1>
        <Link
          href="/events/new"
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
        >
          + Create Event
        </Link>
      </div>

      {myEvents.length === 0 && (
        <p className="text-sm text-gray-400">No events yet. Create one to get started.</p>
      )}

      <ul className="space-y-3">
        {myEvents.map((event) => {
          const stats = statsMap[event.id];
          const total = stats?.total ?? 0;
          const checkedIn = stats?.checkedIn ?? 0;
          return (
            <li key={event.id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900">{event.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(event.dateTime).toLocaleString()} · {event.location}
                  </p>
                </div>
                <Link
                  href={`/scan?event=${event.id}`}
                  className="shrink-0 rounded-lg border border-indigo-200 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                >
                  Scan
                </Link>
              </div>
              <div className="mt-3 flex gap-4 text-xs text-gray-500">
                <span>{total} registered</span>
                <span>{checkedIn} checked in</span>
                <span>{event.maxCapacity - total} spots left</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
