import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { events, tickets } from "@/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";

interface SyncEntry {
  ticket_id: string;
  scanned_at: string;
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entries: SyncEntry[] = await request.json();
  if (!Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Bulk ownership check: find which of the submitted ticket_ids actually
  // belong to an event owned by the caller. Any ticket not in this set is
  // rejected — an organizer can only sync check-ins for their own events.
  const incomingIds = entries.map((e) => e.ticket_id);
  const ownedRows = await db
    .select({ id: tickets.id })
    .from(tickets)
    .innerJoin(events, eq(tickets.eventId, events.id))
    .where(
      and(
        eq(events.organizerId, user.id),
        inArray(tickets.id, incomingIds),
      ),
    );
  const ownedIds = new Set(ownedRows.map((r) => r.id));

  const results = await Promise.all(
    entries.map(async (entry) => {
      // Reject entries the caller doesn't own before touching the DB.
      if (!ownedIds.has(entry.ticket_id)) {
        return { ticket_id: entry.ticket_id, success: false };
      }

      try {
        await db
          .update(tickets)
          .set({
            isCheckedIn: true,
            scannedAt: new Date(entry.scanned_at),
          })
          .where(
            and(
              eq(tickets.id, entry.ticket_id),
              eq(tickets.isCheckedIn, false),
            ),
          );
        return { ticket_id: entry.ticket_id, success: true };
      } catch {
        return { ticket_id: entry.ticket_id, success: false };
      }
    }),
  );

  return NextResponse.json({ results });
}
