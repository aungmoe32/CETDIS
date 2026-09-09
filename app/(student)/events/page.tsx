import { db } from "@/utils/db";
import { events, tickets } from "@/drizzle/schema";
import { count, gte } from "drizzle-orm";
import StudentEventsCatalog from "./student-events-catalog";

export const metadata = { title: "Campus Events · CETDIS" };

export default async function EventsPage() {
  const now = new Date();

  const upcomingEvents = await db
    .select({
      id: events.id,
      title: events.title,
      dateTime: events.dateTime,
      location: events.location,
      maxCapacity: events.maxCapacity,
      price: events.price,
    })
    .from(events)
    .where(gte(events.dateTime, now))
    .orderBy(events.dateTime);

  // Get ticket counts per event
  const ticketCounts = await db
    .select({ eventId: tickets.eventId, count: count() })
    .from(tickets)
    .groupBy(tickets.eventId);

  const countMap = Object.fromEntries(
    ticketCounts.map((t) => [t.eventId, t.count]),
  );

  const serializedEvents = upcomingEvents.map((event) => {
    const taken = countMap[event.id] ?? 0;
    const spotsLeft = Math.max(0, event.maxCapacity - taken);
    return {
      id: event.id,
      title: event.title,
      dateTime: event.dateTime.toISOString(),
      location: event.location,
      maxCapacity: event.maxCapacity,
      price: event.price ?? 0,
      spotsLeft,
    };
  });

  return <StudentEventsCatalog initialEvents={serializedEvents} />;
}

