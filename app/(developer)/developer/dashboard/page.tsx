import { db } from "@/utils/db";
import { nfcAllocations, nfcIssuances, profiles } from "@/drizzle/schema";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { count, eq, sum } from "drizzle-orm";
import { redirect } from "next/navigation";
import AllocationModal from "./allocation-modal";

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
  const platformUnissued = platformAllocated - platformIssued;

  return (
    <div className="px-5 py-7 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">
        NFC Inventory Dashboard
      </h1>
      <p className="text-sm text-gray-500 mb-7">
        Track blank physical NFC tag rolls allocated to organizers and monitor
        field issuance.
      </p>

      {/* Platform-level stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          {
            label: "Total Tags Allocated",
            value: platformAllocated,
            bg: "bg-indigo-50 border-indigo-100",
            valueColor: "text-indigo-700",
          },
          {
            label: "Tags Linked to Students",
            value: platformIssued,
            bg: "bg-emerald-50 border-emerald-100",
            valueColor: "text-emerald-700",
          },
          {
            label: "Unissued in Circulation",
            value: platformUnissued,
            bg: "bg-amber-50 border-amber-100",
            valueColor: "text-amber-700",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-2xl border ${stat.bg} p-4`}
          >
            <p className="text-xs text-gray-500 mb-1.5">{stat.label}</p>
            <p className={`text-3xl font-bold font-mono ${stat.valueColor}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Organizer table */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">
            Organizer Inventory
          </h2>
          <span className="text-xs text-gray-400">
            {organizers.length} organizers
          </span>
        </div>

        {organizers.length === 0 ? (
          <p className="text-sm text-gray-400 px-5 py-8 text-center">
            No organizers found. Invite an organizer to get started.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                {[
                  "Organizer",
                  "Total Given",
                  "Total Issued",
                  "Stock Remaining",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {organizers.map((org) => {
                const totalAllocated = allocationsMap[org.id] ?? 0;
                const totalIssued = issuancesMap[org.id] ?? 0;
                const stockRemaining = totalAllocated - totalIssued;
                const isLow = stockRemaining <= 20 && stockRemaining >= 0;
                const isOver = stockRemaining < 0;

                return (
                  <tr
                    key={org.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition"
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-800 text-sm">
                        {org.fullName}
                      </p>
                      <p className="text-xs text-gray-400">{org.email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-semibold text-gray-700">
                        {totalAllocated}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-semibold text-emerald-600">
                        {totalIssued}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 font-mono font-bold ${
                          isOver
                            ? "text-red-600"
                            : isLow
                              ? "text-amber-600"
                              : "text-gray-800"
                        }`}
                      >
                        {isOver && (
                          <span className="text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded">
                            OVER
                          </span>
                        )}
                        {isLow && (
                          <span className="text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded">
                            LOW
                          </span>
                        )}
                        {stockRemaining}
                      </span>
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
        )}
      </div>
    </div>
  );
}
