import { db } from "@/utils/db";
import { nfcAllocations, nfcIssuances, profiles } from "@/drizzle/schema";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { count, eq, sum } from "drizzle-orm";
import { redirect } from "next/navigation";
import AllocationModal from "./allocation-modal";
import MaskedEmail from "./masked-email";

export const metadata = { title: "Developer Dashboard · CETDIS" };

export default async function DeveloperDashboardPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // --- Fetch all organizers ---
  const organizers = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      email: profiles.email,
    })
    .from(profiles)
    .where(eq(profiles.role, "organizer"))
    .orderBy(profiles.fullName);

  // --- SUM allocations per organizer ---
  const allocations = await db
    .select({
      organizerId: nfcAllocations.organizerId,
      totalAllocated: sum(nfcAllocations.amount).mapWith(Number),
    })
    .from(nfcAllocations)
    .groupBy(nfcAllocations.organizerId);

  const allocationsMap = Object.fromEntries(
    allocations.map((a) => [a.organizerId, a.totalAllocated ?? 0]),
  );

  // --- COUNT issuances per organizer ---
  const issuances = await db
    .select({
      issuedBy: nfcIssuances.issuedBy,
      totalIssued: count(),
    })
    .from(nfcIssuances)
    .groupBy(nfcIssuances.issuedBy);

  const issuancesMap = Object.fromEntries(
    issuances.map((i) => [i.issuedBy, i.totalIssued ?? 0]),
  );

  // --- Platform-wide totals ---
  const [platformTotals] = await db
    .select({ totalAllocated: sum(nfcAllocations.amount).mapWith(Number) })
    .from(nfcAllocations);

  const [issuanceTotals] = await db
    .select({ totalIssued: count() })
    .from(nfcIssuances);

  const platformAllocated = platformTotals?.totalAllocated ?? 0;
  const platformIssued = issuanceTotals?.totalIssued ?? 0;
  const platformUnissued = Math.max(0, platformAllocated - platformIssued);
  const issuePercentage =
    platformAllocated > 0
      ? Math.min(100, Math.round((platformIssued / platformAllocated) * 100))
      : 0;

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-5xl mx-auto space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div>
        {/* <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full font-dingos-bold">
            Hardware Supply Chain
          </span>
        </div> */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mt-1.5 font-dingos-bold">
          NFC Inventory Dashboard
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Track blank physical NFC tag rolls allocated to organizers, monitor
          door issuances, and replenish stock.
        </p>
      </div>

      {/* Platform-level stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Allocated */}
        <div className="rounded-3xl border border-gray-200/90 bg-white p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 font-dingos-bold">
              Total Tags Allocated
            </span>
            <span className="p-1.5 rounded-xl bg-indigo-50 text-indigo-700">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
              </svg>
            </span>
          </div>
          <p className="font-bebas text-4xl text-indigo-700 tracking-wide">
            {platformAllocated.toLocaleString()}
          </p>
          <p className="text-[11px] text-gray-400 font-medium">
            Dispatched rolls across campus
          </p>
        </div>

        {/* Issued */}
        <div className="rounded-3xl border border-gray-200/90 bg-white p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 font-dingos-bold">
              Tags Linked to Students
            </span>
            <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <circle cx="12" cy="12" r="9" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4"
                />
              </svg>
            </span>
          </div>
          <p className="font-bebas text-4xl text-emerald-600 tracking-wide">
            {platformIssued.toLocaleString()}
          </p>
          <p className="text-[11px] text-gray-400 font-medium">
            {issuePercentage}% of allocated tags issued
          </p>
        </div>

        {/* Unissued in Circulation */}
        <div className="rounded-3xl border border-gray-200/90 bg-white p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 font-dingos-bold">
              Unissued in Field
            </span>
            <span className="p-1.5 rounded-xl bg-amber-50 text-amber-700">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <circle cx="12" cy="12" r="9" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3"
                />
              </svg>
            </span>
          </div>
          <p className="font-bebas text-4xl text-amber-600 tracking-wide">
            {platformUnissued.toLocaleString()}
          </p>
          <p className="text-[11px] text-gray-400 font-medium">
            Held in organizer kits
          </p>
        </div>
      </div>

      {/* Organizer table */}
      <div className="rounded-3xl border border-gray-200/90 bg-white overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900 font-dingos-bold">
              Organizer Inventory
            </h2>
            <p className="text-[11px] text-gray-400">
              Field distribution by organizer
            </p>
          </div>
          <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full font-dingos-bold">
            {organizers.length} Organizers
          </span>
        </div>

        {organizers.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-sm font-bold text-gray-800 font-dingos-bold">
              No organizers registered yet
            </p>
            <p className="text-xs text-gray-400">
              When an organizer creates an account, they will appear here for
              tag allocation.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-5 py-3 font-dingos-bold">
                    Organizer
                  </th>
                  <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-5 py-3 font-dingos-bold">
                    Total Given
                  </th>
                  <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-5 py-3 font-dingos-bold">
                    Total Issued
                  </th>
                  <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-5 py-3 font-dingos-bold">
                    Stock Remaining
                  </th>
                  <th className="text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider px-5 py-3 font-dingos-bold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {organizers.map((org) => {
                  const totalAllocated = allocationsMap[org.id] ?? 0;
                  const totalIssued = issuancesMap[org.id] ?? 0;
                  const stockRemaining = totalAllocated - totalIssued;
                  const isLow = stockRemaining <= 20 && stockRemaining >= 0;
                  const isOver = stockRemaining < 0;

                  return (
                    <tr key={org.id} className="hover:bg-gray-50/60 transition">
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-gray-900 text-sm font-dingos-bold">
                          {org.fullName}
                        </p>
                        <MaskedEmail email={org.email} />
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-bebas text-xl text-gray-900 tracking-wide">
                          {totalAllocated}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-bebas text-xl text-emerald-600 tracking-wide">
                          {totalIssued}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bebas text-xl tracking-wide ${
                              isOver
                                ? "text-red-600"
                                : isLow
                                  ? "text-amber-600"
                                  : "text-gray-900"
                            }`}
                          >
                            {stockRemaining}
                          </span>
                          {isOver && (
                            <span className="text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-dingos-bold">
                              Over Issued
                            </span>
                          )}
                          {isLow && (
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-dingos-bold">
                              Low Stock
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <AllocationModal
                          organizerId={org.id}
                          organizerName={org.fullName}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
