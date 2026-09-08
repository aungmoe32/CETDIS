import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { profiles } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "@/app/(auth)/login/actions";

export default async function DeveloperLayout({
  children,
}: {
  children: ReactNode;
}) {
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

  if (!profile || profile.role !== "developer") redirect("/login");

  return (
    <div className="min-h-screen bg-white flex flex-col select-none">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/90 backdrop-blur-md px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shadow-2xs">
            <svg
              className="h-4 w-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="5" />
              <circle
                cx="12"
                cy="12"
                r="1.5"
                fill="currentColor"
                strokeWidth={0}
              />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-base tracking-tight font-dingos-bold">
            CETDIS
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 px-2 py-0.5 bg-indigo-50 border border-indigo-200/80 rounded-full font-dingos-bold">
            Platform Admin
          </span>
        </div>
        <form action={signOut}>
          <button className="text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-100 px-3 py-1 rounded-full transition tactile-btn font-medium">
            Sign out
          </button>
        </form>
      </header>

      <div className="flex flex-1">
        {/* Desktop Sidebar Navigation */}
        <aside className="w-56 border-r border-gray-100 bg-white p-4 space-y-2 hidden sm:block">
          <div className="px-3 pb-1 pt-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-dingos-bold">
              Admin Controls
            </span>
          </div>
          <Link
            href="/developer/dashboard"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-indigo-900 bg-indigo-50/90 border border-indigo-200/80 shadow-2xs transition tactile-btn font-dingos-bold"
          >
            <div className="p-1.5 rounded-xl bg-indigo-600 text-white shadow-2xs">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <span>NFC Inventory</span>
          </Link>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 bg-white">{children}</main>
      </div>
    </div>
  );
}
