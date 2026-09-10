"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { profiles } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export interface ProfileActionState {
  error?: string;
  success?: boolean;
  message?: string;
}

export async function updateOrganizerNameAction(
  prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to update your profile." };
  }

  const rawName = formData.get("fullName");
  if (typeof rawName !== "string" || !rawName.trim()) {
    return { error: "Full name is required." };
  }

  const trimmedName = rawName.trim();

  if (trimmedName.length < 2) {
    return { error: "Name must be at least 2 characters long." };
  }

  if (trimmedName.length > 80) {
    return { error: "Name cannot exceed 80 characters." };
  }

  try {
    await db
      .update(profiles)
      .set({ fullName: trimmedName })
      .where(eq(profiles.id, user.id));

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    revalidatePath("/events/all");

    return {
      success: true,
      message: "Organizer display name updated successfully.",
    };
  } catch (err: any) {
    return {
      error: err?.message || "Failed to update profile name. Please try again.",
    };
  }
}
