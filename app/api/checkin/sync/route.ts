import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { events, nfcIssuances, profiles, tickets } from "@/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";

interface SyncEntry {
  ticket_id: string;
  type?: "checkin" | "issue_nfc";
  token?: string;
  event_id?: string;
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

  // Separate check-ins vs NFC issue events
  const checkinEntries = entries.filter((e) => e.type !== "issue_nfc");

  // Bulk ownership check for check-ins
  const incomingCheckinIds = checkinEntries.map((e) => e.ticket_id);
  let ownedIds = new Set<string>();

  if (incomingCheckinIds.length > 0) {
    const ownedRows = await db
      .select({ id: tickets.id })
      .from(tickets)
      .innerJoin(events, eq(tickets.eventId, events.id))
      .where(
        and(
          eq(events.organizerId, user.id),
          inArray(tickets.id, incomingCheckinIds),
        ),
      );
    ownedIds = new Set(ownedRows.map((r) => r.id));
  }

  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const results = await Promise.all(
    entries.map(async (entry) => {
      // ── Process NFC Tag Issue sync ─────────────────────────────
      if (entry.type === "issue_nfc") {
        const token = entry.token || entry.ticket_id.replace(/^issue_/, "");
        if (!token || !UUID_RE.test(token)) {
          return { ticket_id: entry.ticket_id, success: false };
        }
        try {
          const [profile] = await db
            .select({ id: profiles.id })
            .from(profiles)
            .where(eq(profiles.checkInToken, token))
            .limit(1);

          if (!profile) return { ticket_id: entry.ticket_id, success: false };

          await db.transaction(async (tx) => {
            await tx
              .update(profiles)
              .set({ nfcIssued: true, purchasedNfc: true })
              .where(eq(profiles.id, profile.id));

            await tx.insert(nfcIssuances).values({
              userId: profile.id,
              issuedBy: user.id,
              eventId: entry.event_id || null,
              issuedAt: new Date(entry.scanned_at),
            });
          });
          return { ticket_id: entry.ticket_id, success: true };
        } catch {
          return { ticket_id: entry.ticket_id, success: false };
        }
      }

      // ── Process Ticket Check-in sync ───────────────────────────
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
