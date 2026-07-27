"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { profiles } from "@/drizzle/schema";
import { eq, ilike } from "drizzle-orm";
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
    })
    .from(profiles)
    .where(ilike(profiles.fullName, `%${query}%`))
    .limit(20);

  return { data: results };
}

export async function revokeTokenAction(userId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const newToken = randomUUID();

  await db
    .update(profiles)
    .set({ checkInToken: newToken })
    .where(eq(profiles.id, userId));

  return { success: true };
}
