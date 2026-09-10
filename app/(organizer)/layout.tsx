import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { profiles } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "@/app/(auth)/login/actions";

import GlobalStatusBar from "./global-status-bar";
import { DesktopSidebarNav, MobileBottomNav } from "./nav-links";

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

  if (profile.role === "student") {
    const headerList = await headers();
    const pathname = headerList.get("x-pathname");
    if (pathname?.startsWith("/profile")) {
      redirect("/my-profile");
    }
    redirect("/my-id");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <GlobalStatusBar />
      <div className="flex flex-1 min-w-0">
        <DesktopSidebarNav />
        <main className="flex-1 min-w-0 pb-24 md:pb-8">{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
