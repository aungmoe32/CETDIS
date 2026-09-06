export default function CreateEventLoading() {
  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-6 animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="h-4 w-36 bg-gray-200 rounded-md" />

      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-56 bg-gray-200 rounded-xl" />
        <div className="h-4 w-80 bg-gray-100 rounded-md" />
      </div>

      {/* Card container skeleton */}
      <div className="rounded-3xl border border-gray-200/90 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
        {/* Title input skeleton */}
        <div className="space-y-2">
          <div className="h-3.5 w-24 bg-gray-200 rounded" />
          <div className="h-11 w-full bg-gray-100 rounded-2xl" />
        </div>

        {/* Description skeleton */}
        <div className="space-y-2">
          <div className="h-3.5 w-32 bg-gray-200 rounded" />
          <div className="h-32 w-full bg-gray-100 rounded-2xl" />
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-3.5 w-24 bg-gray-200 rounded" />
            <div className="h-11 w-full bg-gray-100 rounded-2xl" />
          </div>
          <div className="space-y-2">
            <div className="h-3.5 w-28 bg-gray-200 rounded" />
            <div className="h-11 w-full bg-gray-100 rounded-2xl" />
          </div>
        </div>

        {/* Capacity & Price skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-gray-100">
          <div className="space-y-2">
            <div className="h-3.5 w-28 bg-gray-200 rounded" />
            <div className="h-11 w-full bg-gray-100 rounded-2xl" />
            <div className="flex gap-1.5 pt-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-5 w-10 bg-gray-100 rounded-full" />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3.5 w-28 bg-gray-200 rounded" />
            <div className="h-11 w-full bg-gray-100 rounded-2xl" />
            <div className="flex gap-1.5 pt-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-5 w-12 bg-gray-100 rounded-full" />
              ))}
            </div>
          </div>
        </div>

        {/* Buttons skeleton */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <div className="h-10 w-32 bg-gray-100 rounded-full" />
          <div className="h-11 w-44 bg-indigo-200 rounded-full" />
        </div>
      </div>
    </div>
  );
}
