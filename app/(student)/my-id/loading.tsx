export default function MyIdLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4 py-8 gap-5 pb-24 animate-pulse">
      {/* Digital QR ID Card Skeleton */}
      <div className="w-full max-w-sm bg-white border border-gray-200/90 rounded-3xl shadow-xs p-6 sm:p-7 flex flex-col items-center gap-5">
        {/* Pass Top Badge Skeleton */}
        <div className="flex items-center justify-between w-full border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-gray-200" />
            <div className="h-4 w-20 bg-gray-200 rounded" />
          </div>
          <div className="h-4 w-24 bg-gray-100 rounded-full" />
        </div>

        {/* Avatar, Name & Email */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-gray-200" />
          <div className="h-5 w-36 bg-gray-200 rounded-md" />
          <div className="h-3.5 w-44 bg-gray-100 rounded-md" />
        </div>

        {/* QR Code Container */}
        <div className="w-56 h-56 bg-gray-100 rounded-3xl flex items-center justify-center border border-gray-200/60" />

        {/* Helper Hint */}
        <div className="space-y-1.5 flex flex-col items-center">
          <div className="h-3.5 w-48 bg-gray-100 rounded-md" />
          <div className="h-3 w-32 bg-gray-100 rounded-md" />
        </div>
      </div>

      {/* NFC Pass Section Skeleton */}
      <div className="w-full max-w-sm bg-white border border-gray-200/90 rounded-3xl shadow-xs p-5 sm:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gray-200" />
            <div className="space-y-1">
              <div className="h-4 w-28 bg-gray-200 rounded" />
              <div className="h-3 w-20 bg-gray-100 rounded" />
            </div>
          </div>
          <div className="h-4 w-16 bg-gray-100 rounded-full" />
        </div>
        <div className="h-3.5 w-full bg-gray-100 rounded" />
        <div className="h-10 w-full bg-gray-100 rounded-full" />
      </div>
    </div>
  );
}
