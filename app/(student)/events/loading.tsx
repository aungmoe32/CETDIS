export default function StudentEventsLoading() {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-4 animate-pulse">
      {/* Title */}
      <div className="h-6 w-44 bg-gray-200 rounded-md" />

      {/* Event Card Skeletons */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="border border-gray-200 bg-white rounded-xl p-4 space-y-2.5 shadow-2xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="h-5 w-48 bg-gray-200 rounded-md" />
              <div className="h-4 w-14 bg-gray-100 rounded-md" />
            </div>
            <div className="h-3.5 w-36 bg-gray-100 rounded" />
            <div className="flex items-center justify-between pt-1">
              <div className="h-3 w-28 bg-gray-100 rounded" />
              <div className="h-3 w-16 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
