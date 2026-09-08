export default function DeveloperDashboardLoading() {
  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-pulse">
      {/* Title & Subtitle */}
      <div className="space-y-2">
        <div className="h-5 w-32 bg-gray-100 rounded-full" />
        <div className="h-8 w-60 bg-gray-200 rounded-xl" />
        <div className="h-4 w-80 bg-gray-100 rounded-md" />
      </div>

      {/* 3 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-3xl border border-gray-200/90 bg-white p-5 space-y-3 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 bg-gray-100 rounded" />
              <div className="w-8 h-8 rounded-xl bg-gray-100" />
            </div>
            <div className="h-9 w-20 bg-gray-200 rounded-md" />
            <div className="h-3.5 w-36 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Organizers Table Skeleton */}
      <div className="rounded-3xl border border-gray-200/90 bg-white overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-5 w-40 bg-gray-200 rounded" />
            <div className="h-3 w-28 bg-gray-100 rounded" />
          </div>
          <div className="h-6 w-24 bg-gray-100 rounded-full" />
        </div>
        <div className="divide-y divide-gray-100">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="h-4 w-36 bg-gray-200 rounded" />
                <div className="h-3 w-48 bg-gray-100 rounded" />
              </div>
              <div className="flex items-center gap-6">
                <div className="h-6 w-12 bg-gray-100 rounded" />
                <div className="h-6 w-12 bg-gray-100 rounded" />
                <div className="h-6 w-16 bg-gray-100 rounded" />
                <div className="h-8 w-24 bg-indigo-100 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
