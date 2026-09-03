export default function AllEventsLoading() {
  return (
    <div className="px-4 py-6 max-w-4xl mx-auto space-y-6 pb-20 sm:pb-6 animate-pulse">
      {/* ── Header Skeleton ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="h-7 w-36 bg-gray-200 rounded-lg" />
          <div className="h-4 w-64 bg-gray-100 rounded-md" />
        </div>
        <div className="h-9 w-28 bg-gray-200 rounded-xl" />
      </div>

      {/* ── Filters Box Skeleton ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs space-y-3.5">
        {/* Search bar placeholder */}
        <div className="h-10 w-full bg-gray-100 rounded-xl" />

        {/* Status tabs & Selectors */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="h-7 w-16 bg-gray-200 rounded-xl" />
            <div className="h-7 w-16 bg-gray-100 rounded-xl" />
            <div className="h-7 w-20 bg-gray-100 rounded-xl" />
            <div className="h-7 w-16 bg-gray-100 rounded-xl" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-24 bg-gray-100 rounded-xl" />
            <div className="h-7 w-32 bg-gray-100 rounded-xl" />
          </div>
        </div>
      </div>

      {/* ── Event Cards Skeleton List ──────────────────────────────────── */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-xs space-y-3.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-48 bg-gray-200 rounded-md" />
                  <div className="h-4 w-12 bg-gray-100 rounded-md" />
                  <div className="h-4 w-16 bg-gray-100 rounded-md" />
                </div>
                <div className="h-3.5 w-60 bg-gray-100 rounded-md" />
              </div>
              <div className="h-8 w-16 bg-gray-200 rounded-xl" />
            </div>

            {/* Progress Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="rounded-xl bg-gray-50 p-2.5 border border-gray-100 space-y-1.5">
                <div className="flex justify-between">
                  <div className="h-3.5 w-16 bg-gray-200 rounded" />
                  <div className="h-3.5 w-20 bg-gray-200 rounded" />
                </div>
                <div className="h-1.5 w-full bg-gray-200 rounded-full" />
              </div>

              <div className="rounded-xl bg-gray-50 p-2.5 border border-gray-100 space-y-1.5">
                <div className="flex justify-between">
                  <div className="h-3.5 w-16 bg-gray-200 rounded" />
                  <div className="h-3.5 w-20 bg-gray-200 rounded" />
                </div>
                <div className="h-1.5 w-full bg-gray-200 rounded-full" />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 border-t border-gray-100 flex justify-end gap-2">
              <div className="h-7 w-24 bg-gray-100 rounded-xl" />
              <div className="h-7 w-16 bg-gray-100 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
