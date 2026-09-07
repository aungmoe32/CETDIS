export default function LoginLoading() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white px-4 py-12 animate-pulse">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gray-200" />
          <div className="h-6 w-24 bg-gray-200 rounded-lg" />
          <div className="h-3 w-40 bg-gray-100 rounded-full" />
        </div>

        {/* Card Container */}
        <div className="rounded-3xl border border-gray-200/90 bg-white p-7 sm:p-9 shadow-xs space-y-6">
          <div className="h-6 w-32 bg-gray-100 rounded-full" />

          <div className="space-y-2">
            <div className="h-8 w-44 bg-gray-200 rounded-xl" />
            <div className="h-4 w-72 bg-gray-100 rounded-md" />
          </div>

          <div className="space-y-2 pt-2">
            <div className="h-3.5 w-28 bg-gray-200 rounded" />
            <div className="h-12 w-full bg-gray-100 rounded-2xl" />
          </div>

          <div className="h-12 w-full bg-indigo-200 rounded-full" />

          <div className="pt-4 border-t border-gray-100 flex justify-between">
            <div className="h-3.5 w-20 bg-gray-100 rounded" />
            <div className="h-3.5 w-24 bg-gray-100 rounded" />
            <div className="h-3.5 w-20 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    </main>
  );
}
