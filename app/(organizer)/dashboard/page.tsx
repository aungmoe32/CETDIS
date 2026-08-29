import { db } from "@/utils/db";
import { events, nfcAllocations, nfcIssuances, tickets } from "@/drizzle/schema";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { count, eq, sql, sum } from "drizzle-orm";
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
      price: events.price,
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

  const [nfcStats] = await db
    .select({ totalIssued: count() })
    .from(nfcIssuances)
    .where(eq(nfcIssuances.issuedBy, user.id));

  const totalNfcIssued = nfcStats?.totalIssued ?? 0;

  const [allocationStats] = await db
    .select({ totalAllocated: sum(nfcAllocations.amount).mapWith(Number) })
    .from(nfcAllocations)
    .where(eq(nfcAllocations.organizerId, user.id));

  const totalAllocated = allocationStats?.totalAllocated ?? 0;
  const blankTagsRemaining = totalAllocated - totalNfcIssued;
  const hasAllocationData = totalAllocated > 0;

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

      {/* Blank Tag Stock Warning Banner */}
      {hasAllocationData && (
        <div
          className={`mb-4 rounded-2xl border px-4 py-3 flex items-center gap-3 ${
            blankTagsRemaining <= 0
              ? "bg-red-50/60 border-red-200/70"
              : blankTagsRemaining <= 20
                ? "bg-amber-50/60 border-amber-200/70"
                : "bg-emerald-50/60 border-emerald-200/70"
          }`}
        >
          <span className="text-lg">
            {blankTagsRemaining <= 0 ? "🚨" : blankTagsRemaining <= 20 ? "⚠️" : "📦"}
          </span>
          <div className="flex-1">
            {blankTagsRemaining <= 20 ? (
              <>
                <p className={`text-xs font-bold ${
                  blankTagsRemaining <= 0 ? "text-red-800" : "text-amber-800"
                }`}>
                  {blankTagsRemaining <= 0
                    ? "No Blank Tags Remaining!"
                    : `Low Tag Inventory! You have ${blankTagsRemaining} blank tag${blankTagsRemaining !== 1 ? "s" : ""} left.`}
                </p>
                <p className={`text-[11px] mt-0.5 ${
                  blankTagsRemaining <= 0 ? "text-red-600" : "text-amber-700"
                }`}>
                  Please contact the platform administrator for a refill roll.
                </p>
              </>
            ) : (
              <p className="text-xs font-semibold text-emerald-800">
                Blank NFC Tags Remaining:{" "}
                <span className="font-mono font-bold">{blankTagsRemaining}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* NFC Supply Chain / Inventory Tracking Card */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-indigo-50/40 border border-indigo-100/80 p-4.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <svg
              className="h-5 w-5"
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
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                NFC Tags Issued
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold">
                Supply Chain
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Need more blank tags? Contact the Developer for a refill roll.
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-gray-900 font-mono">
            {totalNfcIssued}
          </span>
          <span className="block text-[11px] text-gray-400">tags handed out</span>
        </div>
      </div>

      {myEvents.length === 0 && (
        <p className="text-sm text-gray-400">No events yet. Create one to get started.</p>
      )}

      <ul className="space-y-3">
        {myEvents.map((event) => {
          const stats = statsMap[event.id];
          const total = stats?.total ?? 0;
          const checkedIn = stats?.checkedIn ?? 0;
          const isFree = !event.price || event.price === 0;
          return (
            <li key={event.id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900">{event.title}</p>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                        isFree
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      }`}
                    >
                      {isFree ? "Free" : `${event.price.toLocaleString()} MMK`}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
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
