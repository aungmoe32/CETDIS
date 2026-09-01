"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { events, nfcIssuances, profiles, tickets } from "@/drizzle/schema";
import { and, eq, ilike, or, inArray } from "drizzle-orm";

export interface StudentSearchResult {
  id: string;
  fullName: string;
  email: string;
  purchasedNfc: boolean;
  nfcIssued: boolean;
  checkInToken: string;
  tickets: Array<{
    ticketId: string;
    eventId: string;
    eventTitle: string;
    eventDateTime: Date;
    isCheckedIn: boolean;
    scannedAt: Date | null;
  }>;
}

export async function searchStudentsForDashboardAction(
  query: string,
): Promise<{ data: StudentSearchResult[]; error?: string }> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return { data: [] };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated", data: [] };

  // 1. Search matching student profiles (limit 15)
  const studentProfiles = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      email: profiles.email,
      purchasedNfc: profiles.purchasedNfc,
      nfcIssued: profiles.nfcIssued,
      checkInToken: profiles.checkInToken,
    })
    .from(profiles)
    .where(
      and(
        eq(profiles.role, "student"),
        or(
          ilike(profiles.fullName, `%${trimmed}%`),
          ilike(profiles.email, `%${trimmed}%`),
        ),
      ),
    )
    .limit(15);

  if (studentProfiles.length === 0) return { data: [] };

  const studentIds = studentProfiles.map((s) => s.id);

  // 2. Fetch all tickets for these students across this organizer's events
  const studentTickets = await db
    .select({
      ticketId: tickets.id,
      userId: tickets.userId,
      eventId: tickets.eventId,
      isCheckedIn: tickets.isCheckedIn,
      scannedAt: tickets.scannedAt,
      eventTitle: events.title,
      eventDateTime: events.dateTime,
    })
    .from(tickets)
    .innerJoin(events, eq(tickets.eventId, events.id))
    .where(
      and(
        inArray(tickets.userId, studentIds),
        eq(events.organizerId, user.id),
      ),
    );

  const ticketsByStudent = new Map<string, StudentSearchResult["tickets"]>();
  for (const t of studentTickets) {
    const list = ticketsByStudent.get(t.userId) ?? [];
    list.push({
      ticketId: t.ticketId,
      eventId: t.eventId,
      eventTitle: t.eventTitle,
      eventDateTime: t.eventDateTime,
      isCheckedIn: t.isCheckedIn,
      scannedAt: t.scannedAt,
    });
    ticketsByStudent.set(t.userId, list);
  }

  const results: StudentSearchResult[] = studentProfiles.map((s) => ({
    ...s,
    tickets: ticketsByStudent.get(s.id) ?? [],
  }));

  return { data: results };
}

export async function manualCheckInAction(
  ticketId: string,
): Promise<{ success?: boolean; error?: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify that the organizer owns the event associated with this ticket
  const [ticketRecord] = await db
    .select({
      ticketId: tickets.id,
      isCheckedIn: tickets.isCheckedIn,
      organizerId: events.organizerId,
    })
    .from(tickets)
    .innerJoin(events, eq(tickets.eventId, events.id))
    .where(eq(tickets.id, ticketId))
    .limit(1);

  if (!ticketRecord) return { error: "Ticket not found" };
  if (ticketRecord.organizerId !== user.id) {
    return { error: "Unauthorized: You do not own this event" };
  }
  if (ticketRecord.isCheckedIn) {
    return { error: "Attendee is already checked in" };
  }

  await db
    .update(tickets)
    .set({
      isCheckedIn: true,
      scannedAt: new Date(),
    })
    .where(eq(tickets.id, ticketId));

  revalidatePath("/dashboard");
  return { success: true };
}

export async function manualIssueNfcAction(
  token: string,
  eventId?: string,
): Promise<{ success?: boolean; error?: string }> {
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
  if (profile.nfcIssued) return { error: "NFC tag already linked to this student" };

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

  revalidatePath("/dashboard");
  return { success: true };
}
