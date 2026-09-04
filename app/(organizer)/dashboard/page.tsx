import { db } from "@/utils/db";
import {
  events,
  nfcAllocations,
  nfcIssuances,
  tickets,
} from "@/drizzle/schema";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { count, eq, sql, sum } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import ActionCenter from "./action-center";
import TodayEvents, { type DashboardEventItem } from "./today-events";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
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

  const eventsForActionCenter = myEvents.map((e) => ({
    id: e.id,
    title: e.title,
    dateTime: e.dateTime,
    location: e.location,
    totalRegistered: statsMap[e.id]?.total ?? 0,
    price: e.price ?? 0,
  }));

  const eventsForTodayList: DashboardEventItem[] = myEvents.map((e) => ({
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
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
      {/* ── Dashboard Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-dingos-bold">
            Organizer Operations
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Entrance gate control &amp; attendee management
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-150">
          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
          Door Live
        </span>
      </div>

      {/* Conditional Low NFC Inventory Alert Banner */}
      {hasAllocationData && blankTagsRemaining <= 20 && (
        <div
          className={`rounded-3xl border px-4 py-3.5 flex items-start sm:items-center gap-3 shadow-xs tactile-hover ${
            blankTagsRemaining <= 0
              ? "bg-red-50/80 border-red-200"
              : "bg-amber-50/80 border-amber-200"
          }`}
        >
          <div
            className={`flex-shrink-0 w-9 h-9 rounded-2xl flex items-center justify-center mt-0.5 sm:mt-0 ${
              blankTagsRemaining <= 0
                ? "bg-red-100 text-red-600"
                : "bg-amber-100 text-amber-600"
            }`}
          >
            {blankTagsRemaining <= 0 ? (
              // Alert octagon / critical stop
              <svg
                className="w-4.5 h-4.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v4m0 4h.01M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2z"
                />
              </svg>
            ) : (
              // Warning triangle
              <svg
                className="w-4.5 h-4.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`text-xs font-bold font-dingos-bold ${
                blankTagsRemaining <= 0 ? "text-red-900" : "text-amber-900"
              }`}
            >
              {blankTagsRemaining <= 0
                ? "No Blank NFC Tags Remaining"
                : `Low NFC Inventory (${blankTagsRemaining} remaining)`}
            </p>
            <p
              className={`text-xs mt-0.5 ${
                blankTagsRemaining <= 0 ? "text-red-700" : "text-amber-800"
              }`}
            >
              Contact platform admin for refill.
            </p>
          </div>
        </div>
      )}

      {/* ── Section 2: The Action Center (Primary Focus Area) ─────────────── */}
      <ActionCenter events={eventsForActionCenter} />

      {/* ── Section 3: Today's Events & Live Metrics ──────────────────────── */}
      <div className="border-t border-gray-100 pt-5">
        <TodayEvents events={eventsForTodayList} />
      </div>

      {/* Section 4: NFC Supply Chain Ledger Summary */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/30 border border-indigo-100 p-5 flex items-center justify-between shadow-xs tactile-hover">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
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
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 font-dingos-bold">
                NFC Tags Issued
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-semibold">
                Physical Pass
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Need more blank tags? Contact the Developer for a refill roll.
            </p>
          </div>
        </div>
        <div className="text-right pl-3 flex-shrink-0">
          <span className="text-3xl text-gray-900 font-bebas tracking-wide block leading-none">
            {totalNfcIssued}
          </span>
          <span className="block text-[11px] text-gray-400 font-medium mt-1">
            tags handed out
          </span>
        </div>
      </div>
    </div>
  );
}
