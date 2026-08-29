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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="border-b border-gray-200 bg-white px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-6 rounded-md bg-indigo-600 flex items-center justify-center">
            <svg
              className="h-3.5 w-3.5 text-white"
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
          <span className="font-semibold text-gray-900 text-sm tracking-tight">
            CETDIS
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 rounded">
            Platform Admin
          </span>
        </div>
        <form action={signOut}>
          <button className="text-xs text-gray-400 hover:text-gray-600 transition">
            Sign out
          </button>
        </form>
      </header>

      <div className="flex flex-1">
        <nav className="w-48 border-r border-gray-200 bg-white p-4 space-y-0.5 hidden sm:block">
          <Link
            href="/developer/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-indigo-700 transition"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Dashboard
          </Link>
        </nav>

        <main className="flex-1 bg-gray-50">{children}</main>
      </div>
    </div>
  );
}
