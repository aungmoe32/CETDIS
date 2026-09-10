import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { profiles } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "@/app/(auth)/login/actions";

import { StudentNav } from "./student-nav";
import { StudentHeader } from "./student-header";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!profile) redirect("/login");
  if (profile.role === "organizer") redirect("/dashboard");
  if (profile.role === "developer") redirect("/developer/dashboard");

  return (
    <div className="min-h-screen bg-white flex flex-col select-none">
      <StudentHeader />

      <main className="flex-1 pb-20">{children}</main>

      <StudentNav />
    </div>
  );
}
