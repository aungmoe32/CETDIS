"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { checkInAction, loadGuestListAction } from "./actions";
import { offlineCheckIn } from "@/lib/offline-checkin";
import { flushSyncQueue } from "@/lib/sync";
import {
  getTicketByToken,
  markCheckedInLocally,
  upsertTicket,
  saveGuestList,
  getPendingSyncs,
  hasCachedTickets,
} from "@/lib/idb";
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

    // Auto-restore offline mode if a guest list was downloaded in a previous
    // session. The organizer doesn't have to re-download every page reload.
    hasCachedTickets(eventId).then((has) => {
      if (has && !isOnlineRef.current) {
        setOfflineEnabled(true);
        offlineEnabledRef.current = true;
      }
    });

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
      // Release the camera when the organizer navigates away.
      // Use the ref directly here (not stopScanner) to avoid TDZ issues.
      const s = scannerRef.current;
      if (s) { s.stop().catch(() => {}); scannerRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Shared teardown — stops the camera and resets to idle.
  // Called by the Stop button, the unmount cleanup, and after each scan.
  const stopScanner = useCallback(async () => {
    activeRef.current = false;
    const scanner = scannerRef.current;
    if (scanner) {
      try { await scanner.stop(); } catch { /* already stopped */ }
      scannerRef.current = null;
    }
    setStatus("idle");
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
              event_id: eventId,
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
    try {
      const result = await loadGuestListAction(eventId);
      if (result.error) {
        alert(result.error);
      } else if (result.data) {
        await saveGuestList(result.data);
        offlineEnabledRef.current = true;
        setOfflineEnabled(true);
        alert(`Guest list downloaded: ${result.data.length} attendees`);
      }
    } catch {
      // Thrown when the Server Action itself can't reach the network
      alert(
        "Network error: could not connect to the server. Check your connection and try again.",
      );
    } finally {
      // Always clear the spinner, even on failure
      setIsLoading(false);
    }
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
      className={`min-h-screen flex flex-col transition-colors duration-500 ${statusColors[status]}`}
    >
      {/* ── Result flash ──────────────────────────────────────────────────────
          Full-screen colour + icon + name for 3 s. Easy to read from a distance. */}
      {status !== "idle" && status !== "scanning" && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-3">
          <span className="text-7xl font-bold text-white leading-none">
            {status === "success" ? "✓" : "✗"}
          </span>
          <p className="text-white text-2xl font-semibold text-center">{message}</p>
          {status === "success" && (
            <p className="text-white/70 text-sm">Check-in successful</p>
          )}
          {status === "already_scanned" && (
            <p className="text-white/70 text-sm">Already checked in</p>
          )}
        </div>
      )}

      {/* ── Scanner state ─────────────────────────────────────────────────── */}
      {(status === "idle" || status === "scanning") && (
        <>
          {/* Camera area — takes all remaining vertical space */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-6">
            {status === "scanning" && (
              <p className="text-sm text-gray-400">Point camera at the student's QR code</p>
            )}

            {/* The html5-qrcode library mounts the video into this div */}
            <div id="qr-reader" className="w-full max-w-sm rounded-2xl overflow-hidden shadow-lg" />

            {status === "idle" && (
              <button
                onClick={startScanner}
                className="w-full max-w-sm rounded-2xl bg-indigo-600 px-6 py-4 text-base font-semibold text-white hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md"
              >
                Start Scanner
              </button>
            )}

            {status === "scanning" && (
              <button
                onClick={stopScanner}
                className="w-full max-w-sm rounded-2xl border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 active:scale-[0.98] transition-all"
              >
                Stop Scanner
              </button>
            )}
          </div>

          {/* ── Bottom toolbar ─────────────────────────────────────────────
              Sticky footer: connectivity pill + sync badge on one row,
              offline action buttons on a second row (only when relevant). */}
          <div className="shrink-0 bg-white border-t border-gray-100 px-4 pt-3 pb-safe-4 space-y-2"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>

            {/* Row 1: status + pending sync badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-400"}`}
                />
                <span className="text-xs text-gray-500">
                  {isOnline ? "Online" : "Offline"}
                  {offlineEnabled ? " · Offline mode" : ""}
                </span>
              </div>

              {isOnline && pendingCount > 0 && (
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200 disabled:opacity-50 transition-colors"
                >
                  {isSyncing ? "Syncing…" : `↑ ${pendingCount} unsynced`}
                </button>
              )}
            </div>

            {/* Row 2: offline actions — only appear when relevant */}
            {isOnline && !offlineEnabled && (
              <button
                onClick={downloadGuestList}
                disabled={isLoading}
                className="w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-600 hover:bg-indigo-100 disabled:opacity-40 transition-colors"
              >
                {isLoading ? "Downloading guest list…" : "Enable Offline Mode"}
              </button>
            )}

            {offlineEnabled && isOnline && (
              <div className="flex gap-2">
                <button
                  onClick={downloadGuestList}
                  disabled={isLoading}
                  className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  {isLoading ? "Refreshing…" : "↻ Refresh list"}
                </button>
                <button
                  onClick={disableOfflineMode}
                  className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Use live mode
                </button>
              </div>
            )}
          </div>
          {/* end toolbar */}
        </>
      )}
    </div>
  );
}
