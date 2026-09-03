export default function DashboardLoading() {
  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-6 animate-pulse">
      {/* ── Action Center Skeleton ────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Main 2 CTA Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Scanner Card Skeleton */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-gray-200" />
            <div className="space-y-1.5">
              <div className="h-5 w-28 bg-gray-200 rounded-md" />
              <div className="h-3.5 w-40 bg-gray-100 rounded-md" />
            </div>
          </div>

          {/* Walk-Up Card Skeleton */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-gray-200" />
            <div className="space-y-1.5">
              <div className="h-5 w-28 bg-gray-200 rounded-md" />
              <div className="h-3.5 w-40 bg-gray-100 rounded-md" />
            </div>
          </div>
        </div>

        {/* Search / Manual Lookup Bar Skeleton */}
        <div className="h-11 rounded-xl bg-white border border-gray-200 shadow-xs" />
      </div>

      {/* ── Today's Events Section Skeleton ───────────────────────────── */}
      <div className="border-t border-gray-100 pt-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-44 bg-gray-200 rounded-md" />
          <div className="h-4 w-24 bg-gray-100 rounded-md" />
        </div>

        {/* Event Card Skeleton */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 space-y-4 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <div className="h-5 w-36 bg-gray-200 rounded-md" />
                <div className="h-4 w-12 bg-gray-100 rounded-md" />
              </div>
              <div className="h-3.5 w-48 bg-gray-100 rounded-md" />
            </div>
            <div className="h-8 w-16 bg-gray-200 rounded-xl" />
          </div>

          {/* Progress Bars Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl bg-gray-50 p-3 border border-gray-100 space-y-2">
              <div className="flex justify-between">
                <div className="h-3.5 w-14 bg-gray-200 rounded" />
                <div className="h-3.5 w-20 bg-gray-200 rounded" />
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full" />
              <div className="h-3 w-28 bg-gray-100 rounded" />
            </div>

            <div className="rounded-xl bg-gray-50 p-3 border border-gray-100 space-y-2">
              <div className="flex justify-between">
                <div className="h-3.5 w-24 bg-gray-200 rounded" />
                <div className="h-3.5 w-16 bg-gray-200 rounded" />
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full" />
              <div className="h-3 w-32 bg-gray-100 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* ── NFC Ledger Skeleton ────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white border border-gray-200 p-4.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gray-200" />
          <div className="space-y-1.5">
            <div className="h-4 w-28 bg-gray-200 rounded" />
            <div className="h-3 w-48 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="h-7 w-12 bg-gray-200 rounded-md" />
      </div>
    </div>
  );
}
