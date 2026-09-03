export default function CreateEventLoading() {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6 animate-pulse">
      <div className="h-6 w-36 bg-gray-200 rounded-md" />

      <div className="space-y-4">
        {/* Title */}
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

        {/* Submit button */}
        <div className="pt-2">
          <div className="h-11 w-full bg-gray-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
