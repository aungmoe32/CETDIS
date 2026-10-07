"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { events, nfcIssuances, profiles, tickets } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";

export type CheckInResult =
  | {
      status: "success";
      fullName: string;
      ticketId: string;
      token: string;
      purchasedNfc?: boolean;
      nfcIssued?: boolean;
      needsNfcHandover?: boolean;
    }
  | {
      status: "no_ticket";
      profileId: string;
      fullName: string;
      eventPrice: number;
      eventTitle: string;
      token: string;
      purchasedNfc?: boolean;
      nfcIssued?: boolean;
    }
  | {
      status: "already_scanned";
      fullName?: string;
      scannedAt?: string | null;
      token?: string;
    }
  | { status: "not_found" }
  | { status: "error"; message: string };

export async function checkInAction(
  token: string,
  eventId: string,
): Promise<CheckInResult> {
  // Validate token format before touching the DB — Postgres will throw a
  // type error if it receives a non-UUID string for a uuid column.
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(token)) return { status: "not_found" };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Not authenticated" };

  // Ownership check: the caller must be the organizer of this event.
  const [event] = await db
    .select({
      organizerId: events.organizerId,
      price: events.price,
      title: events.title,
    })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) return { status: "not_found" };
  if (event.organizerId !== user.id) {
    return { status: "error", message: "Forbidden" };
  }

  // Query 1: resolve token → user profile
  const [profile] = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      purchasedNfc: profiles.purchasedNfc,
      nfcIssued: profiles.nfcIssued,
    })
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

  if (!ticket) {
    // Recognized student, but no RSVP/ticket for this specific event
    return {
      status: "no_ticket",
      profileId: profile.id,
      fullName: profile.fullName,
      eventPrice: event.price,
      eventTitle: event.title,
      token,
      purchasedNfc: profile.purchasedNfc,
      nfcIssued: profile.nfcIssued,
    };
  }

  if (ticket.isCheckedIn) {
    return {
      status: "already_scanned",
      fullName: profile.fullName,
      scannedAt: ticket.scannedAt ? ticket.scannedAt.toISOString() : null,
      token,
    };
  }

  // Mark as checked in
  await db
    .update(tickets)
    .set({ isCheckedIn: true, scannedAt: new Date() })
    .where(eq(tickets.id, ticket.id));

  const needsNfcHandover = Boolean(profile.purchasedNfc && !profile.nfcIssued);

  return {
    status: "success",
    fullName: profile.fullName,
    ticketId: ticket.id,
    token,
    purchasedNfc: profile.purchasedNfc,
    nfcIssued: profile.nfcIssued,
    needsNfcHandover,
  };
}

export async function sellWalkUpTicketToStudentAction({
  profileId,
  eventId,
  token,
}: {
  profileId: string;
  eventId: string;
  token: string;
}): Promise<CheckInResult> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Not authenticated" };

  const [event] = await db
    .select({ organizerId: events.organizerId })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) return { status: "not_found" };
  if (event.organizerId !== user.id) {
    return { status: "error", message: "Forbidden" };
  }

  const [profile] = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      purchasedNfc: profiles.purchasedNfc,
      nfcIssued: profiles.nfcIssued,
    })
    .from(profiles)
    .where(eq(profiles.id, profileId))
    .limit(1);

  if (!profile) return { status: "not_found" };

  // Check if a ticket was already created
  const [existingTicket] = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.userId, profile.id), eq(tickets.eventId, eventId)))
    .limit(1);

  let ticketId: string;

  if (existingTicket) {
    if (existingTicket.isCheckedIn) return { status: "already_scanned" };
    await db
      .update(tickets)
      .set({
        isCheckedIn: true,
        scannedAt: new Date(),
        purchaseMethod: "cash_at_door",
      })
      .where(eq(tickets.id, existingTicket.id));
    ticketId = existingTicket.id;
  } else {
    const [newTicket] = await db
      .insert(tickets)
      .values({
        userId: profile.id,
        eventId,
        isCheckedIn: true,
        scannedAt: new Date(),
        purchaseMethod: "cash_at_door",
      })
      .returning({ id: tickets.id });
    ticketId = newTicket.id;
  }

  const needsNfcHandover = Boolean(profile.purchasedNfc && !profile.nfcIssued);

  return {
    status: "success",
    fullName: profile.fullName,
    ticketId,
    token,
    purchasedNfc: profile.purchasedNfc,
    nfcIssued: profile.nfcIssued,
    needsNfcHandover,
  };
}

export async function markNfcIssuedAction(token: string, eventId?: string) {
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(token)) return { error: "Invalid token format" };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const [profile] = await db
    .select({
      id: profiles.id,
      purchasedNfc: profiles.purchasedNfc,
      nfcIssued: profiles.nfcIssued,
    })
    .from(profiles)
    .where(eq(profiles.checkInToken, token))
    .limit(1);

  if (!profile) return { error: "Student profile not found" };
  if (profile.nfcIssued) return { error: "NFC tag already issued" };

  await db.transaction(async (tx) => {
    await tx
      .update(profiles)
      .set({ nfcIssued: true, purchasedNfc: true })
      .where(eq(profiles.id, profile.id));

    await tx.insert(nfcIssuances).values({
      userId: profile.id,
      issuedBy: user.id,
      eventId: eventId || null,
    });
  });

  return { success: true };
}

export async function loadGuestListAction(eventId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const guestList = await db
    .select({
      ticket_id: tickets.id,
      event_id: tickets.eventId,
      check_in_token: profiles.checkInToken,
      full_name: profiles.fullName,
      is_checked_in: tickets.isCheckedIn,
      purchased_nfc: profiles.purchasedNfc,
      nfc_issued: profiles.nfcIssued,
    })
    .from(tickets)
    .innerJoin(profiles, eq(tickets.userId, profiles.id))
    .where(eq(tickets.eventId, eventId));

  const [event] = await db
    .select({
      id: events.id,
      title: events.title,
      price: events.price,
    })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  const studentProfiles = await db
    .select({
      profile_id: profiles.id,
      check_in_token: profiles.checkInToken,
      full_name: profiles.fullName,
      purchased_nfc: profiles.purchasedNfc,
      nfc_issued: profiles.nfcIssued,
    })
    .from(profiles)
    .where(eq(profiles.role, "student"));

  return {
    data: guestList,
    eventMeta: event ?? null,
    profiles: studentProfiles,
  };
}
