import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { profiles } from "@/drizzle/schema";
import DeveloperProfileForm from "./profile-form";

export const metadata = {
  title: "Developer Profile · CEDIS",
};

export default async function DeveloperProfilePage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!profile || profile.role !== "developer") redirect("/login");

  return (
    <div className="px-3.5 sm:px-6 py-4 sm:py-6 max-w-2xl mx-auto space-y-5 sm:space-y-6 pb-12">
      {/* Breadcrumb Trail */}
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
        <Link
          href="/developer/dashboard"
          className="hover:text-indigo-600 transition flex items-center gap-1 font-dingos-bold"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          <span>Dashboard</span>
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-dingos-bold">Profile</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 font-dingos-bold">
          Developer Profile
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Update your public display name and review account credentials.
        </p>
      </div>

      {/* Interactive Form Component */}
      <DeveloperProfileForm
        initialName={profile.fullName}
        email={profile.email}
        role={profile.role}
        createdAt={profile.createdAt.toISOString()}
      />
    </div>
  );
}
