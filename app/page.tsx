import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { profiles } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Root route — pure redirect, never renders UI.
 *
 * Unauthenticated  → /login
 * Student          → /my-id
 * Organizer        → /dashboard
 */
export default async function RootPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profile] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!profile) redirect("/login");

  redirect(profile?.role === "organizer" ? "/dashboard" : "/my-id");
}
