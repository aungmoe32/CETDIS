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
    <div className="min-h-screen bg-white flex flex-col select-none">
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/90 backdrop-blur-md px-4 py-2.5 sm:py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center flex-shrink-0 shadow-2xs">
            <svg
              className="h-4 w-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="5" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" strokeWidth={0} />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-base tracking-tight font-dingos-bold">
            CETDIS
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 px-2 py-0.5 bg-indigo-50 border border-indigo-200/80 rounded-full font-dingos-bold">
            Student
          </span>
        </div>

        <form action={signOut}>
          <button className="text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-100 px-2.5 py-1 rounded-full transition tactile-btn font-medium cursor-pointer">
            Sign out
          </button>
        </form>
      </header>

      <main className="flex-1 pb-20">{children}</main>

      <StudentNav />
    </div>
  );
}
