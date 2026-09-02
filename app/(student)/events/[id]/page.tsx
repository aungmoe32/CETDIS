import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { events, profiles, tickets } from "@/drizzle/schema";
import { and, count, eq } from "drizzle-orm";
import EventDetailClient from "./components/event-detail-client";

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

  const [currentUserProfile] = await db
    .select({ fullName: profiles.fullName })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  const [row] = await db
    .select({
      id: events.id,
      title: events.title,
      dateTime: events.dateTime,
      location: events.location,
      maxCapacity: events.maxCapacity,
      price: events.price,
      organizerName: profiles.fullName,
    })
    .from(events)
    .leftJoin(profiles, eq(events.organizerId, profiles.id))
    .where(eq(events.id, id))
    .limit(1);

  if (!row) notFound();

  const [{ ticketCount }] = await db
    .select({ ticketCount: count() })
    .from(tickets)
    .where(eq(tickets.eventId, id));

  const [existingTicket] = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.userId, user.id), eq(tickets.eventId, id)))
    .limit(1);

  const isFull = ticketCount >= row.maxCapacity;
  const hasTicket = !!existingTicket;
  const isFree = !row.price || row.price === 0;

  return (
    <EventDetailClient
      event={{
        ...row,
        dateTime: row.dateTime.toISOString(),
      }}
      ticketCount={ticketCount}
      hasTicket={hasTicket}
      isFull={isFull}
      isFree={isFree}
      currentUser={{
        id: user.id,
        fullName: currentUserProfile?.fullName,
      }}
    />
  );
}

