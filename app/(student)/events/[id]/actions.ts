"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { events, tickets } from "@/drizzle/schema";
import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function rsvpAction(formData: FormData): Promise<void> {
  const eventId = formData.get("event_id") as string;
  if (!eventId) return;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check capacity
  const [event] = await db
    .select({ maxCapacity: events.maxCapacity })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) return;

  const [{ ticketCount }] = await db
    .select({ ticketCount: count() })
    .from(tickets)
    .where(eq(tickets.eventId, eventId));

  if (ticketCount >= event.maxCapacity) {
    // Revalidate to show "event full" status without errors
    revalidatePath(`/events/${eventId}`);
    return;
  }

  try {
    await db.insert(tickets).values({
      userId: user.id,
      eventId,
    });
  } catch {
    // Duplicate ticket — ignore, revalidate will show "registered" state
  }

  revalidatePath(`/events/${eventId}`);
}
