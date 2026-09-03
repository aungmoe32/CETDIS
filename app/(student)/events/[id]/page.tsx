import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { events, tickets } from "@/drizzle/schema";
import { and, count, eq } from "drizzle-orm";
import { rsvpAction } from "./actions";
import CheckoutModal from "./checkout-modal";
import RichTextView from "@/components/rich-text-view";
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

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/events"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 mb-2"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Events</span>
        </Link>
      </div>

      {/* Main Event Header Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold text-gray-900">{event.title}</h1>
          <span
            className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold shrink-0 ${
              isFree
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-indigo-50 text-indigo-700 border border-indigo-200"
            }`}
          >
            {isFree ? "Free" : `${event.price.toLocaleString()} MMK`}
          </span>
        </div>

        {/* Metadata Details with Clean SVG Icons */}
        <div className="space-y-2 text-xs text-gray-600 pt-1 border-t border-gray-100">
          <div className="flex items-center gap-2.5">
            <svg
              className="w-4 h-4 text-gray-400 shrink-0"
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
            <span>
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
            </span>
          </div>

          {event.location && (
            <div className="flex items-center gap-2.5">
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
              <span>{event.location}</span>
            </div>
          )}

          <div className="flex items-center gap-2.5">
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span>
              {ticketCount} / {event.maxCapacity} registered ({Math.max(0, event.maxCapacity - ticketCount)} spots available)
            </span>
          </div>
        </div>
      </div>

      {/* Rich Text Description Section */}
      {event.description && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
            About this event
          </h2>
          <RichTextView content={event.description} />
        </div>
      )}

      {/* RSVP Action Status */}
      {hasTicket ? (
        <div className="rounded-2xl bg-green-50 border border-green-200 px-4 py-3.5 text-sm text-green-800 font-semibold flex items-center gap-2.5 shadow-2xs">
          <svg
            className="w-5 h-5 text-green-600 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>You&apos;re registered for this event</span>
        </div>
      ) : isFull ? (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3.5 text-sm text-red-700 font-semibold shadow-2xs">
          This event has reached full capacity
        </div>
      ) : isFree ? (
        <form action={rsvpAction}>
          <input type="hidden" name="event_id" value={id} />
          <button
            type="submit"
            className="w-full rounded-2xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-indigo-700 active:scale-[0.99] transition-all shadow-xs"
          >
            RSVP for this event (Free)
          </button>
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
