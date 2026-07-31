"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { checkInAction, loadGuestListAction } from "./actions";
import { offlineCheckIn } from "@/lib/offline-checkin";
import { flushSyncQueue } from "@/lib/sync";
import { getTicketByToken, markCheckedInLocally, upsertTicket, saveGuestList, getPendingSyncs } from "@/lib/idb";
import type { CheckInResult } from "./actions";

interface Props {
  eventId: string;
}

type ScanStatus =
  | "idle"
  | "scanning"
  | "success"
  | "already_scanned"
  | "not_found"
  | "error";

export default function Scanner({ eventId }: Props) {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [message, setMessage] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [offlineEnabled, setOfflineEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const activeRef = useRef(false);
  // Refs so the scanner callback always reads the live value,
  // not the value captured at the time startScanner was created.
  const isOnlineRef = useRef(true);
  const offlineEnabledRef = useRef(false);

  useEffect(() => {
    const online = navigator.onLine;
    setIsOnline(online);
    isOnlineRef.current = online;

    // Flush any pending syncs left over from a previous session on mount.
    if (online) flushSyncQueue();

    // Populate the pending count badge.
    getPendingSyncs().then((q) => setPendingCount(q.length));

    const handleOnline = () => {
      isOnlineRef.current = true;
      setIsOnline(true);
      flushSyncQueue();
    };
    const handleOffline = () => {
      isOnlineRef.current = false;
      setIsOnline(false);
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);


  const handleResult = useCallback((result: CheckInResult) => {
    if (result.status === "success") {
      setStatus("success");
      setMessage(result.fullName);
    } else if (result.status === "already_scanned") {
      setStatus("already_scanned");
      setMessage("Already checked in");
    } else {
      setStatus("not_found");
      setMessage("Not on guest list");
    }
    // Reset after 3s
    setTimeout(() => {
      setStatus("idle");
      setMessage("");
    }, 3000);
  }, []);

  const startScanner = useCallback(() => {
    const qrRegion = document.getElementById("qr-reader");
    if (!qrRegion) return;
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;
    activeRef.current = true;
    setStatus("scanning");

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      async (decodedText) => {
        if (!activeRef.current) return;
        // Extract token from URL: /scan/<token>
        const token = decodedText.split("/").pop() ?? decodedText;

        activeRef.current = false;
        await scanner.stop();

        // ── FIX 1: Split-brain shield ────────────────────────────────────
        // Always check local DB first, even when online.
        // If we scanned this ticket locally (pending or already synced),
        // reject immediately — don't ask the server.
        const localTicket = await getTicketByToken(token);
        if (localTicket?.is_checked_in) {
          handleResult({ status: "already_scanned" });
          return;
        }

        // ── Route to offline or online path ──────────────────────────────
        if (!isOnlineRef.current || offlineEnabledRef.current) {
          // OFFLINE: check against local cache
          const result = await offlineCheckIn(token);
          handleResult(result as CheckInResult);
        } else {
          // ONLINE: ask the server
          const result = await checkInAction(token, eventId);

          // ── Dynamically cache this ticket in IndexedDB ────────────────
          // Whether the ticket was in the local DB already or not, we
          // upsert it now with the authoritative server data.
          // This grows the offline cache organically as scans happen, so
          // if internet drops later the local DB has an accurate picture.
          if (result.status === "success") {
            await upsertTicket({
              ticket_id: result.ticketId,
              check_in_token: result.token,
              full_name: result.fullName,
              is_checked_in: true,
            });
          }

          handleResult(result);
        }

        // Refresh the pending badge after every scan so it reflects any
        // new offline entries added to the sync queue.
        getPendingSyncs().then((q) => setPendingCount(q.length));
      },
      undefined,
    );
  }, [eventId, handleResult]); // isOnline/offlineEnabled intentionally omitted — read via refs

  // Shared helper: download/refresh the local guest list from the server.
  const downloadGuestList = async () => {
    setIsLoading(true);
    const result = await loadGuestListAction(eventId);
    if (result.error) {
      alert(result.error);
    } else if (result.data) {
      await saveGuestList(result.data);
      offlineEnabledRef.current = true;
      setOfflineEnabled(true);
      alert(`Guest list downloaded: ${result.data.length} attendees`);
    }
    setIsLoading(false);
  };

  const disableOfflineMode = () => {
    offlineEnabledRef.current = false;
    setOfflineEnabled(false);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await flushSyncQueue();
    const remaining = await getPendingSyncs();
    setPendingCount(remaining.length);
    setIsSyncing(false);
  };

  const statusColors: Record<ScanStatus, string> = {
    idle: "bg-gray-50",
    scanning: "bg-gray-50",
    success: "bg-green-500",
    already_scanned: "bg-yellow-400",
    not_found: "bg-red-500",
    error: "bg-red-500",
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-300 ${statusColors[status]}`}
    >
      {/* Status overlay */}
      {status !== "idle" && status !== "scanning" && (
        <div className="flex flex-col items-center justify-center flex-1 px-4">
          <p className="text-white text-4xl font-bold mb-2">
            {status === "success" ? "✓" : "✗"}
          </p>
          <p className="text-white text-2xl font-semibold">{message}</p>
          {status === "success" && (
            <p className="text-white/80 text-sm mt-1">Check-in successful</p>
          )}
        </div>
      )}

      {/* Scanner UI */}
      {(status === "idle" || status === "scanning") && (
        <div className="flex flex-col items-center justify-center flex-1 px-4 py-8 gap-4">
          <div
            id="qr-reader"
            className="w-full max-w-xs rounded-xl overflow-hidden"
          />

          {status === "idle" && (
            <button
              onClick={startScanner}
              className="w-full max-w-xs rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Start Scanner
            </button>
          )}

          <div className="flex items-center gap-2 mt-2">
            <span
              className={`h-2 w-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-400"}`}
            />
            <span className="text-xs text-gray-500">
              {isOnline ? "Online" : "Offline"}
              {offlineEnabled ? " · Offline mode enabled" : ""}
            </span>
          </div>

          {/* Manual sync button — visible when online and there are pending entries */}
          {isOnline && pendingCount > 0 && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors"
            >
              {isSyncing ? (
                "Syncing…"
              ) : (
                <>
                  <span>↑</span>
                  <span>{pendingCount} pending — Sync now</span>
                </>
              )}
            </button>
          )}

          {/* Offline mode controls */}
          {!offlineEnabled ? (
            <button
              onClick={downloadGuestList}
              disabled={isLoading || !isOnline}
              className="text-xs text-indigo-600 hover:underline disabled:opacity-40"
            >
              {isLoading ? "Downloading…" : "Enable Offline Mode"}
            </button>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              {/* Refresh: re-download the guest list to pick up late RSVPs */}
              <button
                onClick={downloadGuestList}
                disabled={isLoading || !isOnline}
                className="text-xs text-indigo-600 hover:underline disabled:opacity-40"
                title={
                  !isOnline
                    ? "No internet connection"
                    : "Re-download guest list to pick up late RSVPs"
                }
              >
                {isLoading ? "Refreshing…" : "↻ Refresh guest list"}
              </button>
              {/* Go back to live mode when internet is restored */}
              {isOnline && (
                <button
                  onClick={disableOfflineMode}
                  className="text-xs text-indigo-600 hover:text-gray-600 hover:underline"
                  title="Switch back to live server check-ins"
                >
                  Use live mode
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
