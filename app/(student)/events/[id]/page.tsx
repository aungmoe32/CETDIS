import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { events, tickets } from "@/drizzle/schema";
import { and, count, eq } from "drizzle-orm";
import { rsvpAction } from "./actions";
import CheckoutModal from "./checkout-modal";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
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

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h1 className="text-xl font-semibold text-gray-900">{event.title}</h1>
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

      <p className="text-sm text-gray-500 mb-1">
        {new Date(event.dateTime).toLocaleString()}
      </p>
      {event.location && (
        <p className="text-sm text-gray-500 mb-4">📍 {event.location}</p>
      )}
      <p className="text-sm text-gray-600 mb-6">
        {ticketCount} / {event.maxCapacity} registered
      </p>

      {hasTicket ? (
        <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-medium">
          ✓ You&apos;re registered for this event
        </div>
      ) : isFull ? (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          This event is full
        </div>
      ) : isFree ? (
        <form action={rsvpAction}>
          <input type="hidden" name="event_id" value={id} />
          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
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
