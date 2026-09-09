export default function StudentEventsLoading() {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5 animate-pulse select-none">
      {/* Title & Badge */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-7 w-44 bg-gray-200 rounded-xl" />
          <div className="h-3.5 w-60 bg-gray-100 rounded-lg" />
        </div>
        <div className="h-6 w-20 bg-gray-100 rounded-full" />
      </div>

      {/* Event Card Skeletons */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="border border-gray-200/90 bg-white rounded-3xl p-4 sm:p-5 space-y-3 shadow-xs"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-13 rounded-2xl bg-gray-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="h-5 w-48 bg-gray-200 rounded-lg" />
                  <div className="h-5 w-16 bg-gray-100 rounded-full" />
                </div>
                <div className="h-3.5 w-36 bg-gray-100 rounded-md" />
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="h-3.5 w-24 bg-gray-100 rounded-md" />
                  <div className="h-3.5 w-14 bg-gray-100 rounded-md" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
