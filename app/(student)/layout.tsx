import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { profiles } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "@/app/(auth)/login/actions";

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

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-gray-900 text-sm">CETDIS</span>
        <form action={signOut}>
          <button className="text-xs text-gray-400 hover:text-gray-600">Sign out</button>
        </form>
      </header>
      <main className="flex-1">{children}</main>
      <nav className="border-t border-gray-100 flex">
        <Link href="/my-id" className="flex-1 py-3 text-center text-xs font-medium text-gray-600 hover:text-indigo-600">
          My ID
        </Link>
        <Link href="/events" className="flex-1 py-3 text-center text-xs font-medium text-gray-600 hover:text-indigo-600">
          Events
        </Link>
      </nav>
    </div>
  );
}
