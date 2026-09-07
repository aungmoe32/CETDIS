export default function ScanLoading() {
  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem-4rem)] sm:h-[calc(100dvh-3.5rem)] overflow-hidden bg-gray-50/30 animate-pulse">
      {/* Top Event Header */}
      <div className="px-4 py-2.5 sm:py-3 border-b border-gray-200/90 bg-white shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-200" />
          <div className="space-y-1">
            <div className="h-3 w-20 bg-gray-200 rounded-full" />
            <div className="h-4 w-44 bg-gray-300 rounded-md" />
          </div>
        </div>
        <div className="h-6 w-24 bg-gray-100 rounded-full" />
      </div>

      {/* Main Viewport Skeleton */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-5">
        <div className="h-6 w-48 bg-gray-100 rounded-full" />
        {/* Scanner Viewport Box */}
        <div className="w-full max-w-xs sm:max-w-sm aspect-square rounded-3xl bg-gray-100 shadow-xs flex items-center justify-center border-2 border-gray-200/60">
          <div className="w-14 h-14 rounded-2xl bg-gray-200" />
        </div>
        {/* Action Button */}
        <div className="w-full max-w-xs sm:max-w-sm h-14 bg-gray-200 rounded-full shadow-xs" />
      </div>

      {/* Bottom Floating Bar */}
      <div className="shrink-0 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-3.5">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="h-6 w-28 bg-gray-100 rounded-full" />
          <div className="h-6 w-24 bg-gray-100 rounded-full" />
        </div>
      </div>
    </div>
  );
}
