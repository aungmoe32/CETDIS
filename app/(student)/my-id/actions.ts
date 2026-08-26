"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { profiles } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

import { randomUUID } from "crypto";

export async function purchaseNfcAction() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  await db
    .update(profiles)
    .set({ purchasedNfc: true, nfcIssued: false })
    .where(eq(profiles.id, user.id));

  revalidatePath("/my-id");
  return { success: true };
}

export async function reportLostTagAction() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const newToken = randomUUID();

  await db
    .update(profiles)
    .set({
      checkInToken: newToken,
      purchasedNfc: false,
      nfcIssued: false,
    })
    .where(eq(profiles.id, user.id));

  revalidatePath("/my-id");
  return { success: true };
}
