"use client";

import { useEffect, useState, useCallback } from "react";
import { getPendingSyncs } from "@/lib/idb";
import { flushSyncQueue } from "@/lib/sync";
import { signOut } from "@/app/(auth)/login/actions";

export default function GlobalStatusBar() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const checkSyncCount = useCallback(async () => {
    try {
      const pending = await getPendingSyncs();
      setPendingCount(pending.length);
    } catch {
      // IndexedDB might not be available or initialized yet
    }
  }, []);

  const handleManualSync = async () => {
    if (!isOnline || isSyncing || pendingCount === 0) return;
    setIsSyncing(true);
    try {
      await flushSyncQueue();
      await checkSyncCount();
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // Initial check
    setIsOnline(navigator.onLine);
    checkSyncCount();

    const handleOnline = () => {
      setIsOnline(true);
      flushSyncQueue().then(() => checkSyncCount());
    };

    const handleOffline = () => {
      setIsOnline(false);
      checkSyncCount();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkSyncCount();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Poll every 10s for sync queue updates (e.g. while scanning)
    const interval = setInterval(checkSyncCount, 10000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [checkSyncCount]);

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-xs px-4 py-2.5 sm:py-3 transition-colors">
      <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto">
        {/* Left: Brand & Role */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 rounded-md bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <svg
              className="h-3.5 w-3.5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="5" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" strokeWidth={0} />
            </svg>
          </div>
          <span className="font-semibold text-gray-900 text-sm tracking-tight truncate">
            CETDIS
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 rounded flex-shrink-0 hidden xs:inline-block">
            Organizer
          </span>
        </div>

        {/* Right: Status Indicators & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Pending Sync Count Badge (if pending items exist) */}
          {pendingCount > 0 && (
            <button
              onClick={handleManualSync}
              disabled={!isOnline || isSyncing}
              title={isOnline ? "Click to sync now" : "Stored locally. Will sync when back online."}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                isOnline
                  ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 cursor-pointer"
                  : "bg-gray-100 text-gray-700 border-gray-300 cursor-default"
              }`}
            >
              <svg
                className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-amber-700" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>
                {isSyncing ? "Syncing..." : `${pendingCount} Pending Sync`}
              </span>
            </button>
          )}

          {/* Network Indicator */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isOnline
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-gray-100 text-gray-600 border-gray-200"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
              }`}
            />
            <span className="font-semibold text-[11px]">
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>

          {/* Sign Out */}
          <form action={signOut} className="flex items-center">
            <button
              type="submit"
              className="text-xs text-gray-400 hover:text-gray-600 px-1 py-1 rounded transition"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
