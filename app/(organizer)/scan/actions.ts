"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { profiles, tickets } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";

export type CheckInResult =
  | { status: "success"; fullName: string }
  | { status: "not_found" }
  | { status: "already_scanned" }
  | { status: "error"; message: string };

export async function checkInAction(
  token: string,
  eventId: string,
): Promise<CheckInResult> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Not authenticated" };

  // Query 1: resolve token → user profile
  const [profile] = await db
    .select({ id: profiles.id, fullName: profiles.fullName })
    .from(profiles)
    .where(eq(profiles.checkInToken, token))
    .limit(1);

  if (!profile) return { status: "not_found" };

  // Query 2: find ticket for this user + event
  const [ticket] = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.userId, profile.id), eq(tickets.eventId, eventId)))
    .limit(1);

  if (!ticket) return { status: "not_found" };
  if (ticket.isCheckedIn) return { status: "already_scanned" };

  // Condition C: mark as checked in
  await db
    .update(tickets)
    .set({ isCheckedIn: true, scannedAt: new Date() })
    .where(eq(tickets.id, ticket.id));

  return { status: "success", fullName: profile.fullName };
}

export async function loadGuestListAction(eventId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const guestList = await db
    .select({
      ticket_id: tickets.id,
      check_in_token: profiles.checkInToken,
      full_name: profiles.fullName,
      is_checked_in: tickets.isCheckedIn,
    })
    .from(tickets)
    .innerJoin(profiles, eq(tickets.userId, profiles.id))
    .where(eq(tickets.eventId, eventId));

  return { data: guestList };
}
