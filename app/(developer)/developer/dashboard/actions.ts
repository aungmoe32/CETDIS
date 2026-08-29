"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { nfcAllocations, profiles } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export async function allocateTagsAction(formData: FormData) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify developer role
  const [profile] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!profile || profile.role !== "developer") {
    return { error: "Forbidden: only platform developers can allocate tags" };
  }

  const organizerId = formData.get("organizerId") as string;
  const amountStr = formData.get("amount") as string;
  const notes = (formData.get("notes") as string) || null;

  if (!organizerId) return { error: "Organizer ID is required" };

  const amount = parseInt(amountStr, 10);
  if (isNaN(amount) || amount <= 0) {
    return { error: "Amount must be a positive integer" };
  }

  // Verify the target organizer exists and has the correct role
  const [organizer] = await db
    .select({ id: profiles.id, role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, organizerId))
    .limit(1);

  if (!organizer || organizer.role !== "organizer") {
    return { error: "Target profile not found or is not an organizer" };
  }

  await db.insert(nfcAllocations).values({ organizerId, amount, notes });

  revalidatePath("/developer/dashboard");
  return { success: true };
}
