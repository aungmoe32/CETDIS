import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { profiles } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "@/app/(auth)/login/actions";

import GlobalStatusBar from "./global-status-bar";

export default async function OrganizerLayout({ children }: { children: ReactNode }) {
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
  if (profile.role === "student") redirect("/my-id");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <GlobalStatusBar />
      <div className="flex flex-1">
        <nav className="w-44 border-r border-gray-100 p-4 space-y-1 hidden sm:block">
          <Link href="/dashboard" className="block px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-indigo-600">
            Dashboard
          </Link>
          <Link href="/events/new" className="block px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-indigo-600">
            Create Event
          </Link>
          <Link href="/admin" className="block px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-indigo-600">
            Admin
          </Link>
        </nav>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
