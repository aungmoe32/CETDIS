import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { profiles, tickets } from "@/drizzle/schema";
import StudentProfileForm from "./profile-form";

export const metadata = {
  title: "My Profile · CETDIS",
};

export default async function StudentProfilePage() {
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

  if (!profile) redirect("/login");

  // Fetch count of tickets / RSVPs for this student
  const [ticketsResult] = await db
    .select({ count: count() })
    .from(tickets)
    .where(eq(tickets.userId, user.id));

  const totalTickets = ticketsResult?.count ?? 0;

  return (
    <div className="px-3.5 sm:px-4 py-4 sm:py-6 max-w-2xl mx-auto space-y-5 sm:space-y-6 pb-24">
      {/* Breadcrumb Trail */}
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
        <Link
          href="/my-id"
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
          <span>My ID</span>
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-dingos-bold">Profile</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 font-dingos-bold">
          Student Profile
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Update your public student display name and review account
          credentials.
        </p>
      </div>

      {/* Overview Stat Strip */}
      {/* <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <div className="rounded-2xl border border-gray-200/90 bg-white p-3.5 shadow-2xs">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400 font-dingos-bold">
            Registered Events
          </p>
          <p className="font-bebas text-2xl sm:text-3xl text-gray-900 tracking-wide mt-0.5">
            {totalTickets}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Campus RSVPs</p>
        </div>

        <div className="rounded-2xl border border-gray-200/90 bg-white p-3.5 shadow-2xs">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400 font-dingos-bold">
            Digital ID Pass
          </p>
          <p className="font-bebas text-2xl sm:text-3xl text-emerald-600 tracking-wide mt-0.5">
            Active
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">QR &amp; NFC Access</p>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-gray-200/90 bg-white p-3.5 shadow-2xs">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400 font-dingos-bold">
            Account Role
          </p>
          <p className="font-bebas text-2xl sm:text-3xl text-indigo-600 tracking-wide mt-0.5 capitalize">
            {profile.role}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Verified attendee</p>
        </div>
      </div> */}

      {/* Interactive Form Component */}
      <StudentProfileForm
        initialName={profile.fullName}
        email={profile.email}
        role={profile.role}
        createdAt={profile.createdAt.toISOString()}
      />
    </div>
  );
}
