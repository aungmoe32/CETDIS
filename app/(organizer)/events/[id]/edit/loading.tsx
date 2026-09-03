export default function EditEventLoading() {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6 animate-pulse">
      {/* Back button & Title */}
      <div className="space-y-2">
        <div className="h-4 w-28 bg-gray-100 rounded" />
        <div className="h-7 w-36 bg-gray-200 rounded-lg" />
        <div className="h-3.5 w-64 bg-gray-100 rounded" />
      </div>

      {/* Form Fields Skeleton */}
      <div className="space-y-4">
        {/* Title input */}
        <div className="space-y-1.5">
          <div className="h-3.5 w-20 bg-gray-200 rounded" />
          <div className="h-10 w-full bg-gray-100 rounded-xl" />
        </div>

        {/* Date / Time */}
        <div className="space-y-1.5">
          <div className="h-3.5 w-24 bg-gray-200 rounded" />
          <div className="h-10 w-full bg-gray-100 rounded-xl" />
        </div>

        {/* Location */}
        <div className="space-y-1.5">
          <div className="h-3.5 w-16 bg-gray-200 rounded" />
          <div className="h-10 w-full bg-gray-100 rounded-xl" />
        </div>

        {/* Capacity & Price */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="h-3.5 w-24 bg-gray-200 rounded" />
            <div className="h-10 w-full bg-gray-100 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3.5 w-20 bg-gray-200 rounded" />
            <div className="h-10 w-full bg-gray-100 rounded-xl" />
          </div>
        </div>

        {/* Save & Cancel buttons */}
        <div className="flex gap-3 pt-3">
          <div className="h-11 flex-1 bg-gray-200 rounded-xl" />
          <div className="h-11 w-24 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
