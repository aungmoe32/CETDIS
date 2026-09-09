export default function EventDetailLoading() {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5 animate-pulse select-none">
      {/* Back button pill skeleton */}
      <div className="h-7 w-28 bg-gray-100 rounded-full" />

      {/* Main Event Card Skeleton */}
      <div className="rounded-3xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="h-4 w-20 bg-gray-100 rounded-full" />
            <div className="h-7 w-56 bg-gray-200 rounded-xl" />
          </div>
          <div className="h-6 w-20 bg-gray-100 rounded-full shrink-0" />
        </div>

        {/* Metadata Details Grid Skeletons */}
        <div className="space-y-2.5 pt-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50/70 border border-gray-100"
            >
              <div className="w-9 h-9 rounded-xl bg-white border border-gray-200/80 shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-16 bg-gray-200 rounded" />
                <div className="h-3.5 w-40 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Description Card Skeleton */}
      <div className="rounded-3xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-3">
        <div className="h-3.5 w-28 bg-gray-200 rounded" />
        <div className="space-y-2 pt-1">
          <div className="h-3.5 w-full bg-gray-100 rounded" />
          <div className="h-3.5 w-4/5 bg-gray-100 rounded" />
          <div className="h-3.5 w-3/5 bg-gray-100 rounded" />
        </div>
      </div>

      {/* RSVP Action Box Skeleton */}
      <div className="h-12 w-full bg-gray-200 rounded-2xl" />
    </div>
  );
}
