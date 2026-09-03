export default function MyIdLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4 py-8 gap-4 animate-pulse">
      {/* Digital QR ID Card Skeleton */}
      <div className="w-full max-w-xs bg-white border border-gray-200 rounded-2xl shadow-xs p-6 flex flex-col items-center gap-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gray-200" />

        {/* Name & Email */}
        <div className="space-y-1.5 flex flex-col items-center">
          <div className="h-4 w-32 bg-gray-200 rounded-md" />
          <div className="h-3 w-40 bg-gray-100 rounded-md" />
        </div>

        {/* QR Code Container */}
        <div className="w-48 h-48 bg-gray-100 rounded-xl flex items-center justify-center" />

        {/* Helper Hint */}
        <div className="h-3 w-44 bg-gray-100 rounded-md" />
      </div>

      {/* NFC Pass Section Skeleton */}
      <div className="w-full max-w-xs bg-white border border-gray-200 rounded-2xl shadow-xs p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gray-200" />
            <div className="h-4 w-24 bg-gray-200 rounded" />
          </div>
          <div className="h-4 w-14 bg-gray-100 rounded-full" />
        </div>
        <div className="h-3 w-full bg-gray-100 rounded" />
        <div className="h-9 w-full bg-gray-100 rounded-xl" />
      </div>
    </div>
  );
}
