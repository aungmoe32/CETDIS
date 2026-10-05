import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { profiles } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "@/app/(auth)/login/actions";

import { DeveloperHeader } from "./developer-header";

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

  if (!profile) redirect("/login");
  if (profile.role === "student") redirect("/my-id");
  if (profile.role === "organizer") redirect("/dashboard");
  if (profile.role !== "developer") redirect("/login");

  return (
    <div className="min-h-screen sm:h-screen sm:overflow-hidden bg-white flex flex-col select-none">
      <DeveloperHeader />

      <div className="flex flex-1 sm:overflow-hidden">
        {/* Desktop Sidebar Navigation */}
        <aside className="w-56 shrink-0 border-r border-gray-100 bg-white p-4 space-y-2 hidden sm:block sm:h-full sm:overflow-y-auto">
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
        <main className="flex-1 min-w-0 bg-white sm:overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
