export default function AdminLoading() {
  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-6 animate-pulse">
      {/* Title */}
      <div className="h-6 w-36 bg-gray-200 rounded-md" />

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-xl">
        <div className="flex-1 h-8 bg-white rounded-lg shadow-xs" />
        <div className="flex-1 h-8" />
      </div>

      {/* Lookup Card Skeleton */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4 shadow-xs">
        <div className="h-4 w-48 bg-gray-200 rounded" />
        <div className="h-10 w-full bg-gray-100 rounded-xl" />
        <div className="h-10 w-full bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}
