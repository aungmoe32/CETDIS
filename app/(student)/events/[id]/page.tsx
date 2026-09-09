import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { events, tickets } from "@/drizzle/schema";
import { and, count, eq } from "drizzle-orm";
import { rsvpAction } from "./actions";
import CheckoutModal from "./checkout-modal";
import RichTextView from "@/components/rich-text-view";
import WobbleButton from "@/components/ui/wobble-button";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, id))
    .limit(1);

  if (!event) notFound();

  const [{ ticketCount }] = await db
    .select({ ticketCount: count() })
    .from(tickets)
    .where(eq(tickets.eventId, id));

  const [existingTicket] = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.userId, user.id), eq(tickets.eventId, id)))
    .limit(1);

  const isFull = ticketCount >= event.maxCapacity;
  const hasTicket = !!existingTicket;
  const isFree = !event.price || event.price === 0;
  const eventDate = new Date(event.dateTime);
  const spotsLeft = Math.max(0, event.maxCapacity - ticketCount);

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5 pb-24 select-none">
      {/* Back Link */}
      <div>
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-xs font-bold font-dingos-bold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition active:scale-95 cursor-pointer"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span>Back to Events</span>
        </Link>
      </div>

      {/* Main Event Header Card */}
      <div className="rounded-3xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4 relative overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full font-dingos-bold inline-block">
              Campus Event
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 font-dingos-bold tracking-tight">
              {event.title}
            </h1>
          </div>
          <span
            className={`inline-flex items-center shrink-0 rounded-full px-3 py-1 text-xs font-bold font-dingos-bold ${
              isFree
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-indigo-50 text-indigo-700 border border-indigo-200"
            }`}
          >
            {isFree ? (
              "Free Entry"
            ) : (
              <span className="flex items-baseline gap-1">
                <span className="font-bebas text-base">
                  {event.price.toLocaleString()}
                </span>
                <span className="text-[10px]">MMK</span>
              </span>
            )}
          </span>
        </div>

        {/* Metadata Details Grid */}
        <div className="space-y-2.5 pt-1">
          {/* Date & Time */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50/70 border border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-white border border-gray-200/80 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
              <svg
                className="w-4 h-4"
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
            <div>
              <p className="text-[10px] font-bold text-gray-400 font-dingos-bold uppercase tracking-wider">
                Date &amp; Time
              </p>
              <p className="text-xs font-semibold text-gray-900">
                {eventDate.toLocaleDateString([], {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                at{" "}
                {eventDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50/70 border border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-white border border-gray-200/80 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
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
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 font-dingos-bold uppercase tracking-wider">
                  Campus Venue
                </p>
                <p className="text-xs font-semibold text-gray-900">
                  {event.location}
                </p>
              </div>
            </div>
          )}

          {/* Capacity */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50/70 border border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-white border border-gray-200/80 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-gray-400 font-dingos-bold uppercase tracking-wider">
                  Capacity &amp; Spots
                </p>
                <span
                  className={`text-[11px] font-bold font-dingos-bold ${
                    spotsLeft > 0 ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {spotsLeft > 0 ? `${spotsLeft} spots available` : "Sold Out"}
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-900 mt-0.5">
                {ticketCount} / {event.maxCapacity} registered
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rich Text Description Section */}
      {event.description && (
        <div className="rounded-3xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 font-dingos-bold flex items-center gap-1.5">
            <svg
              className="w-3.5 h-3.5 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>About this event</span>
          </h2>
          <RichTextView content={event.description} />
        </div>
      )}

      {/* RSVP Action Status */}
      {hasTicket ? (
        <div className="rounded-3xl bg-emerald-50 border border-emerald-200 p-4 sm:p-5 text-emerald-800 flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <svg
              className="w-5 h-5"
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
          </div>
          <div>
            <p className="font-bold text-sm font-dingos-bold">
              You&apos;re Registered!
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">
              Your spot is confirmed. Head to{" "}
              <Link href="/my-id" className="underline font-semibold">
                My ID
              </Link>{" "}
              to view your campus pass.
            </p>
          </div>
        </div>
      ) : isFull ? (
        <div className="rounded-3xl bg-red-50 border border-red-200 p-4 sm:p-5 text-red-700 flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-sm font-dingos-bold">
              Event Reached Full Capacity
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              Registration is now closed for this event.
            </p>
          </div>
        </div>
      ) : isFree ? (
        <form action={rsvpAction} className="w-full">
          <input type="hidden" name="event_id" value={id} />
          <WobbleButton
            type="submit"
            text="RSVP for this Event (Free)"
            hoverText="Confirm Free Registration →"
            width="100%"
            className="!py-3.5 !rounded-2xl !text-sm shadow-xs"
          />
        </form>
      ) : (
        <CheckoutModal
          eventId={id}
          eventTitle={event.title}
          price={event.price}
        />
      )}
    </div>
  );
}
