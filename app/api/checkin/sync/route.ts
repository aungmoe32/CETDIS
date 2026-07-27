import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { tickets } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

interface SyncEntry {
  ticket_id: string;
  scanned_at: string;
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entries: SyncEntry[] = await request.json();
  if (!Array.isArray(entries)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const results = await Promise.all(
    entries.map(async (entry) => {
      try {
        await db
          .update(tickets)
          .set({
            isCheckedIn: true,
            scannedAt: new Date(entry.scanned_at),
          })
          .where(eq(tickets.id, entry.ticket_id));
        return { ticket_id: entry.ticket_id, success: true };
      } catch {
        return { ticket_id: entry.ticket_id, success: false };
      }
    }),
  );

  return NextResponse.json({ results });
}
