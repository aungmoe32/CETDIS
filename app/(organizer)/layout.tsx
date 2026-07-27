import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { profiles } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "@/app/(auth)/login/actions";

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
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-gray-900 text-sm">CETDIS · Organizer</span>
        <form action={signOut}>
          <button className="text-xs text-gray-400 hover:text-gray-600">Sign out</button>
        </form>
      </header>
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
