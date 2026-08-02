"use client";

export default function OfflineContent() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      {/* Icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50">
        <svg
          className="h-10 w-10 text-indigo-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3l18 18M8.111 8.111A5.97 5.97 0 006 12a6 6 0 006 6 5.97 5.97 0 003.889-1.889M10.586 10.586A2 2 0 0112 10c.537 0 1.021.21 1.38.553M16.243 16.243A9.97 9.97 0 0112 18c-2.796 0-5.3-1.144-7.121-2.993M19.07 10.93A9.97 9.97 0 0012 8a9.971 9.971 0 00-3.07.487"
          />
        </svg>
      </div>

      {/* Text */}
      <h1 className="text-xl font-semibold text-gray-900 text-center">
        You&apos;re offline
      </h1>
      <p className="mt-2 max-w-xs text-sm text-gray-500 text-center leading-relaxed">
        This page isn&apos;t available without a connection. Check your Wi-Fi
        or mobile data and try again.
      </p>

      {/* Retry */}
      <button
        onClick={() => window.location.reload()}
        className="mt-8 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700 active:scale-95 transition-all"
      >
        Try again
      </button>

      {/* Hint for organizers */}
      <p className="mt-6 text-xs text-gray-400 text-center max-w-xs">
        Organizers: the scanner still works offline once the guest list is
        downloaded.
      </p>
    </div>
  );
}
