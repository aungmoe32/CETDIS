"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { profiles } from "@/drizzle/schema";
import { and, eq, ilike } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function searchStudentsAction(formData: FormData) {
  const query = formData.get("query") as string;
  if (!query?.trim()) return { data: [] };

  const results = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      email: profiles.email,
      role: profiles.role,
      purchasedNfc: profiles.purchasedNfc,
      nfcIssued: profiles.nfcIssued,
      checkInToken: profiles.checkInToken,
    })
    .from(profiles)
    .where(ilike(profiles.fullName, `%${query}%`))
    .limit(20);

  return { data: results };
}

export async function getPendingNfcStudentsAction() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", data: [] };

  const pendingList = await db
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
        eq(profiles.purchasedNfc, true),
        eq(profiles.nfcIssued, false),
      ),
    )
    .limit(50);

  return { data: pendingList };
}

export async function verifyProfileForNfc(token: string) {
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(token)) {
    return { error: "Invalid token format" };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const [profile] = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      email: profiles.email,
      purchasedNfc: profiles.purchasedNfc,
      nfcIssued: profiles.nfcIssued,
      checkInToken: profiles.checkInToken,
    })
    .from(profiles)
    .where(eq(profiles.checkInToken, token))
    .limit(1);

  if (!profile) {
    return { error: "Student profile not found" };
  }

  return { success: true, profile };
}

export async function markNfcIssuedAction(token: string) {
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(token)) {
    return { error: "Invalid token format" };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  await db
    .update(profiles)
    .set({ nfcIssued: true, purchasedNfc: true })
    .where(eq(profiles.checkInToken, token));

  return { success: true };
}

export async function revokeTokenAction(userId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const newToken = randomUUID();

  await db
    .update(profiles)
    .set({
      checkInToken: newToken,
      nfcIssued: false,
    })
    .where(eq(profiles.id, userId));

  return { success: true };
}

