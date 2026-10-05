import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { events, tickets, profiles } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";
import MyTicketsClient from "./tickets-list";

export const metadata = { title: "My Registered Events · CEDIS" };

export default async function MyTicketsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profile] = await db
    .select({ checkInToken: profiles.checkInToken })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!profile) redirect("/login");

  const userTickets = await db
    .select({
      ticketId: tickets.id,
      isCheckedIn: tickets.isCheckedIn,
      scannedAt: tickets.scannedAt,
      purchaseMethod: tickets.purchaseMethod,
      eventId: events.id,
      title: events.title,
      dateTime: events.dateTime,
      location: events.location,
      price: events.price,
    })
    .from(tickets)
    .innerJoin(events, eq(tickets.eventId, events.id))
    .where(eq(tickets.userId, user.id))
    .orderBy(desc(events.dateTime));

  const serializedTickets = userTickets.map((t) => ({
    ticketId: t.ticketId,
    isCheckedIn: t.isCheckedIn,
    scannedAt: t.scannedAt ? t.scannedAt.toISOString() : null,
    purchaseMethod: t.purchaseMethod,
    eventId: t.eventId,
    title: t.title,
    dateTime: t.dateTime.toISOString(),
    location: t.location,
    price: t.price,
  }));

  return (
    <MyTicketsClient
      initialTickets={serializedTickets}
      checkInToken={profile.checkInToken}
    />
  );
}
