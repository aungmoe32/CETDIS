"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function sendOtp(formData: FormData) {
  const email = formData.get("email") as string;
  if (!email) return { error: "Email is required" };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function verifyOtp(formData: FormData) {
  const email = formData.get("email") as string;
  const token = formData.get("token") as string;

  if (!email || !token) return { error: "Email and OTP are required" };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) return { error: error.message };
  if (!data.user) return { error: "Verification failed" };

  // Ensure a profile row exists (trigger handles it, but guard here too)
  const { db } = await import("@/utils/db");
  const { profiles } = await import("@/drizzle/schema");

  await db
    .insert(profiles)
    .values({
      id: data.user.id,
      email: data.user.email!,
      fullName: data.user.user_metadata?.full_name ?? "",
    })
    .onConflictDoNothing();

  redirect("/my-id");
}

export async function signOut() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut();
  redirect("/login");
}
