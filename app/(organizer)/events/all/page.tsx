import { db } from "@/utils/db";
import { events, tickets } from "@/drizzle/schema";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { count, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import EventsListClient from "./events-list";

export const metadata = { title: "All Events" };

export default async function AllEventsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const myEvents = await db
    .select({
      id: events.id,
      title: events.title,
      dateTime: events.dateTime,
      location: events.location,
      maxCapacity: events.maxCapacity,
      price: events.price,
    })
    .from(events)
    .where(eq(events.organizerId, user.id))
    .orderBy(events.dateTime);

  const ticketCounts = await db
    .select({
      eventId: tickets.eventId,
      total: count(),
      checkedIn:
        sql<number>`count(*) filter (where ${tickets.isCheckedIn})`.mapWith(
          Number,
        ),
      walkUpCount:
        sql<number>`count(*) filter (where ${tickets.purchaseMethod} = 'cash_at_door')`.mapWith(
          Number,
        ),
    })
    .from(tickets)
    .groupBy(tickets.eventId);

  const statsMap = Object.fromEntries(ticketCounts.map((t) => [t.eventId, t]));

  const formattedEvents = myEvents.map((e) => ({
    id: e.id,
    title: e.title,
    dateTime: e.dateTime,
    location: e.location,
    maxCapacity: e.maxCapacity,
    price: e.price ?? 0,
    totalRegistered: statsMap[e.id]?.total ?? 0,
    checkedIn: statsMap[e.id]?.checkedIn ?? 0,
    walkUpCount: statsMap[e.id]?.walkUpCount ?? 0,
  }));

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto space-y-6 pb-20 sm:pb-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">All Events</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Manage your schedule, filter attendees, and export guest lists
          </p>
        </div>
        <Link
          href="/events/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 active:scale-95 transition shadow-xs flex-shrink-0"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>Create Event</span>
        </Link>
      </div>

      {/* Interactive Filterable Events List */}
      <EventsListClient initialEvents={formattedEvents} />
    </div>
  );
}
