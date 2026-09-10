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

  const totalEvents = formattedEvents.length;
  const totalAdmitted = formattedEvents.reduce((sum, e) => sum + e.checkedIn, 0);
  const totalRegistered = formattedEvents.reduce((sum, e) => sum + e.totalRegistered, 0);
  const totalDoorRevenue = formattedEvents.reduce(
    (sum, e) => sum + e.walkUpCount * e.price,
    0,
  );

  return (
    <div className="px-3.5 sm:px-4 py-4 sm:py-6 max-w-4xl mx-auto space-y-5 sm:space-y-6 pb-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 font-dingos-bold">
            All Events
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Manage your campus schedule, monitor turnouts, and export guest lists
          </p>
        </div>
        <Link
          href="/events/new"
          className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-bold text-white hover:bg-indigo-700 active:scale-95 transition shadow-xs tactile-btn font-dingos-bold flex-shrink-0"
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
          <span>New Event</span>
        </Link>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="rounded-2xl border border-gray-200/90 bg-white p-3 sm:p-4 shadow-2xs">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-500 font-dingos-bold">
            Hosted Events
          </p>
          <p className="font-bebas text-2xl sm:text-4xl text-gray-900 tracking-wide mt-0.5">
            {totalEvents}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5 truncate">Campus schedules</p>
        </div>

        <div className="rounded-2xl border border-gray-200/90 bg-white p-3 sm:p-4 shadow-2xs">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-500 font-dingos-bold">
            Total RSVPs
          </p>
          <p className="font-bebas text-2xl sm:text-4xl text-indigo-600 tracking-wide mt-0.5">
            {totalRegistered}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5 truncate">Registered students</p>
        </div>

        <div className="rounded-2xl border border-gray-200/90 bg-white p-3 sm:p-4 shadow-2xs">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-500 font-dingos-bold">
            Admitted
          </p>
          <p className="font-bebas text-2xl sm:text-4xl text-emerald-600 tracking-wide mt-0.5">
            {totalAdmitted}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5 truncate">
            {totalRegistered > 0
              ? `${Math.round((totalAdmitted / totalRegistered) * 100)}% attendance rate`
              : "Scanned in"}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200/90 bg-white p-3 sm:p-4 shadow-2xs">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-500 font-dingos-bold">
            Door Sales
          </p>
          <p className="font-bebas text-xl sm:text-3xl text-emerald-700 tracking-wide mt-0.5 sm:mt-1 truncate">
            {totalDoorRevenue.toLocaleString()}{" "}
            <span className="text-[11px] sm:text-xs font-sans font-semibold text-emerald-600">MMK</span>
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5 truncate">Cash at door</p>
        </div>
      </div>

      {/* Interactive Filterable Events List */}
      <EventsListClient initialEvents={formattedEvents} />
    </div>
  );
}
