export default function MyTicketsLoading() {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5 animate-pulse select-none">
      {/* Top Page Switcher Skeleton */}
      <div className="h-10 w-full bg-gray-100 rounded-2xl" />

      {/* Header & Badge Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-7 w-48 bg-gray-200 rounded-xl" />
          <div className="h-3.5 w-60 bg-gray-100 rounded-lg" />
        </div>
        <div className="h-6 w-24 bg-gray-100 rounded-full" />
      </div>

      {/* Search Input Skeleton */}
      <div className="h-10 w-full bg-gray-100 rounded-2xl" />

      {/* Filter Tabs Skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-6 w-24 bg-gray-200 rounded-full" />
        <div className="h-6 w-24 bg-gray-100 rounded-full" />
        <div className="h-6 w-28 bg-gray-100 rounded-full" />
      </div>

      {/* Ticket Cards Skeletons */}
      <div className="space-y-3.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-3xl border border-gray-200/90 bg-white p-5 space-y-3.5 shadow-xs"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-13 rounded-2xl bg-gray-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="h-5 w-44 bg-gray-200 rounded-lg" />
                  <div className="h-5 w-16 bg-gray-100 rounded-full" />
                </div>
                <div className="h-3.5 w-36 bg-gray-100 rounded-md" />
                <div className="h-5 w-28 bg-gray-100 rounded-full" />
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="h-7 w-28 bg-gray-100 rounded-xl" />
              <div className="h-4 w-20 bg-gray-100 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
