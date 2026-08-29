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
  const { eq } = await import("drizzle-orm");

  await db
    .insert(profiles)
    .values({
      id: data.user.id,
      email: data.user.email!,
      fullName: data.user.user_metadata?.full_name ?? "",
    })
    .onConflictDoNothing();

  // Read the role so we redirect directly to the correct home page.
  // Avoids the double redirect that happened when organizers landed on /my-id
  // and the student layout immediately sent them to /dashboard.
  const [profile] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, data.user.id))
    .limit(1);

  if (profile?.role === "developer") redirect("/developer/dashboard");
  redirect(profile?.role === "organizer" ? "/dashboard" : "/my-id");
}


export async function signOut() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut();
  redirect("/login");
}
