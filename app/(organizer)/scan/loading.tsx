export default function ScanLoading() {
  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem-4rem)] sm:h-[calc(100dvh-3.5rem)] overflow-hidden bg-white animate-pulse">
      {/* Top Event Header */}
      <div className="px-4 py-2.5 sm:py-3 border-b border-gray-200 bg-white shrink-0">
        <div className="h-3 w-24 bg-gray-100 rounded mb-1" />
        <div className="h-4 w-44 bg-gray-200 rounded" />
      </div>

      {/* Main Viewport Skeleton */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-5">
        <div className="h-4 w-52 bg-gray-100 rounded" />
        {/* Scanner Viewport Box */}
        <div className="w-full max-w-xs sm:max-w-sm aspect-square rounded-2xl bg-gray-100 shadow-xs flex items-center justify-center">
          <div className="w-12 h-12 rounded-xl bg-gray-200" />
        </div>
        {/* Action Button */}
        <div className="w-full max-w-xs sm:max-w-sm h-12 bg-gray-200 rounded-2xl" />
      </div>

      {/* Bottom Floating Bar */}
      <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3.5">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="h-6 w-24 bg-gray-100 rounded-full" />
          <div className="h-6 w-20 bg-gray-100 rounded-full" />
        </div>
      </div>
    </div>
  );
}
