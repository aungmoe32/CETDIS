"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  checkInAction,
  loadGuestListAction,
  markNfcIssuedAction,
} from "./actions";
import { offlineCheckIn } from "@/lib/offline-checkin";
import { flushSyncQueue } from "@/lib/sync";
import {
  getTicketByToken,
  upsertTicket,
  saveGuestList,
  getPendingSyncs,
  hasCachedTickets,
  markNfcIssuedLocally,
  addToSyncQueue,
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

type ScanMode = "qr" | "nfc";

export default function Scanner({ eventId }: Props) {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [message, setMessage] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [offlineEnabled, setOfflineEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [scanMode, setScanMode] = useState<ScanMode>("qr");
  const [nfcAvailable, setNfcAvailable] = useState(false);
  const [handoverData, setHandoverData] = useState<{
    fullName: string;
    token: string;
  } | null>(null);
  const [isWritingHandover, setIsWritingHandover] = useState(false);
  const [handoverSuccess, setHandoverSuccess] = useState(false);

  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const nfcAbortRef = useRef<AbortController | null>(null);
  const activeRef = useRef(false);       // guards QR double-processing
  const nfcScanningRef = useRef(false);  // so handleResult returns to "scanning" for NFC
  const isOnlineRef = useRef(true);
  const offlineEnabledRef = useRef(false);

  // ── Detect NFC on mount ───────────────────────────────────────────────────
  useEffect(() => {
    setNfcAvailable("NDEFReader" in window);
  }, []);

  // ── Network + bootstrap effect ────────────────────────────────────────────
  useEffect(() => {
    const online = navigator.onLine;
    setIsOnline(online);
    isOnlineRef.current = online;

    if (online) flushSyncQueue();
    getPendingSyncs().then((q) => setPendingCount(q.length));
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
      // Release camera + NFC when the organizer navigates away.
      const s = qrScannerRef.current;
      if (s) {
        try {
          if (s.isScanning) {
            s.stop().catch(() => {});
          }
        } catch {
          /* ignore */
        }
        qrScannerRef.current = null;
      }
      nfcAbortRef.current?.abort();
      nfcAbortRef.current = null;
      nfcScanningRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Result handler ────────────────────────────────────────────────────────
  const handleResult = useCallback((result: CheckInResult) => {
    if (result.status === "success") {
      setStatus("success");
      setMessage(result.fullName);
      if (result.needsNfcHandover) {
        setHandoverData({
          fullName: result.fullName,
          token: result.token,
        });
      }
    } else if (result.status === "already_scanned") {
      setStatus("already_scanned");
      setMessage("Already checked in");
    } else {
      setStatus("not_found");
      setMessage("Not on guest list");
    }
    setTimeout(() => {
      // NFC stays in scanning mode (reader keeps listening).
      // QR returns to idle (user needs to re-tap Start).
      setStatus(nfcScanningRef.current ? "scanning" : "idle");
      setMessage("");
    }, 3000);
  }, []);

  // ── Shared token processor (QR and NFC both call this) ───────────────────
  const processToken = useCallback(
    async (token: string) => {
      // Guard: the token must be a UUID. Any other QR code (e.g. a YouTube URL)
      // would produce a garbage string that crashes Postgres with a type error.
      const UUID_RE =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!UUID_RE.test(token)) {
        handleResult({ status: "not_found" });
        return;
      }

      // Split-brain shield: always check local DB first.
      const localTicket = await getTicketByToken(token);
      if (localTicket?.is_checked_in) {
        handleResult({ status: "already_scanned" });
        getPendingSyncs().then((q) => setPendingCount(q.length));
        return;
      }

      if (!isOnlineRef.current || offlineEnabledRef.current) {
        // OFFLINE path
        const result = await offlineCheckIn(token);
        handleResult(result as CheckInResult);
      } else {
        // ONLINE path
        const result = await checkInAction(token, eventId);
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

      getPendingSyncs().then((q) => setPendingCount(q.length));
    },
    // isOnline/offlineEnabled intentionally read via refs to avoid stale closures
    [eventId, handleResult],
  );

  // ── QR scanner ────────────────────────────────────────────────────────────
  const stopQRScanner = useCallback(async () => {
    activeRef.current = false;
    const s = qrScannerRef.current;
    if (s) {
      try {
        if (s.isScanning) {
          await s.stop();
        }
      } catch {
        /* already stopped */
      }
      qrScannerRef.current = null;
    }
    setStatus("idle");
  }, []);

  const startQRScanner = useCallback(() => {
    const el = document.getElementById("qr-reader");
    if (!el) return;

    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) {
          qrScannerRef.current.stop().catch(() => {});
        }
      } catch {
        /* ignore */
      }
      qrScannerRef.current = null;
    }

    const scanner = new Html5Qrcode("qr-reader");
    qrScannerRef.current = scanner;
    activeRef.current = true;
    setStatus("scanning");

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          if (!activeRef.current) return;
          const token = decodedText.split("/").pop() ?? decodedText;
          activeRef.current = false;
          try {
            if (scanner.isScanning) {
              await scanner.stop();
            }
          } catch {
            /* ignore stop error */
          }
          await processToken(token);
        },
        undefined,
      )
      .catch((err) => {
        console.warn("QR Scanner start failed:", err);
        setStatus("idle");
        activeRef.current = false;
      });
  }, [processToken]);

  // ── NFC scanner ───────────────────────────────────────────────────────────
  const stopNFCScanner = useCallback(() => {
    nfcAbortRef.current?.abort();
    nfcAbortRef.current = null;
    nfcScanningRef.current = false;
    setStatus("idle");
  }, []);

  const startNFCScanner = useCallback(async () => {
    if (!nfcAvailable) return;
    const controller = new AbortController();
    nfcAbortRef.current = controller;
    nfcScanningRef.current = true;
    setStatus("scanning");

    try {
      const ndef = new window.NDEFReader();
      await ndef.scan({ signal: controller.signal });

      ndef.addEventListener(
        "reading",
        async ({ message }) => {
          for (const record of message.records) {
            if (record.recordType !== "url" && record.recordType !== "text") continue;
            const text = new TextDecoder(record.encoding ?? "utf-8").decode(
              record.data,
            );
            const token = text.split("/").pop() ?? text;
            if (token) {
              await processToken(token);
              break; // one tag = one check-in per tap
            }
          }
        },
        { signal: controller.signal },
      );
    } catch (err: unknown) {
      nfcScanningRef.current = false;
      if ((err as Error).name !== "AbortError") {
        alert("NFC error: " + (err as Error).message);
        setStatus("idle");
      }
    }
  }, [nfcAvailable, processToken]);

  // ── Unified start / stop (dispatches to correct mode) ────────────────────
  const startScanner = useCallback(() => {
    if (scanMode === "qr") return startQRScanner();
    return startNFCScanner();
  }, [scanMode, startQRScanner, startNFCScanner]);

  const stopScanner = useCallback(() => {
    if (scanMode === "qr") return stopQRScanner();
    return stopNFCScanner();
  }, [scanMode, stopQRScanner, stopNFCScanner]);

  // ── Mode switch (stops current scanner first) ─────────────────────────────
  const switchMode = useCallback(
    async (mode: ScanMode) => {
      if (status === "scanning") {
        if (scanMode === "qr") await stopQRScanner();
        else stopNFCScanner();
      }
      setScanMode(mode);
    },
    [status, scanMode, stopQRScanner, stopNFCScanner],
  );

  // ── Offline helpers ────────────────────────────────────────────────────────
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
      alert(
        "Network error: could not connect to the server. Check your connection and try again.",
      );
    } finally {
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

  // ── NFC Handover Flow (Fast Issue At Door) ─────────────────────────────────
  const handleIssueHandoverTag = async () => {
    if (!handoverData) return;
    setIsWritingHandover(true);
    try {
      if (nfcAvailable && "NDEFReader" in window) {
        const ndef = new window.NDEFReader();
        await ndef.write(handoverData.token);
      } else {
        // Fallback simulation for devices without Web NFC
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Split-brain guard: update local IndexedDB immediately
      await markNfcIssuedLocally(handoverData.token);

      if (!isOnlineRef.current || offlineEnabledRef.current) {
        // Enqueue offline sync for NFC tag issue
        await addToSyncQueue({
          ticket_id: `issue_${handoverData.token}`,
          type: "issue_nfc",
          token: handoverData.token,
          event_id: eventId,
          scanned_at: new Date().toISOString(),
          sync_status: "pending",
        });
        const remaining = await getPendingSyncs();
        setPendingCount(remaining.length);
      } else {
        await markNfcIssuedAction(handoverData.token, eventId);
      }

      setHandoverSuccess(true);
      setTimeout(() => {
        setHandoverData(null);
        setHandoverSuccess(false);
      }, 1500);
    } catch (err: unknown) {
      alert(`NFC Write Failed: ${(err as Error).message || String(err)}`);
    } finally {
      setIsWritingHandover(false);
    }
  };

  const handleDismissHandover = () => {
    setHandoverData(null);
    setHandoverSuccess(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
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
      {/* ── Result flash ──────────────────────────────────────────────────── */}
      {status !== "idle" && status !== "scanning" && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-3">
          <span className="text-7xl font-bold text-white leading-none">
            {status === "success" ? "✓" : "✗"}
          </span>
          <p className="text-white text-2xl font-semibold text-center">
            {message}
          </p>
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
          {/* Mode tabs — only shown on devices that support NFC */}
          {nfcAvailable && status === "idle" && (
            <div className="flex gap-1 mx-auto mt-6 rounded-xl bg-gray-100 p-1">
              <button
                onClick={() => switchMode("qr")}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  scanMode === "qr"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <path
                    d="M14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2h-2"
                    strokeLinecap="round"
                  />
                </svg>
                QR Code
              </button>
              <button
                onClick={() => switchMode("nfc")}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  scanMode === "nfc"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="5" />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" strokeWidth={0} />
                </svg>
                NFC
              </button>
            </div>
          )}

          {/* Main content area */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-6">

            {/* ── QR mode ───────────────────────────────────────────── */}
            {scanMode === "qr" && (
              <>
                {status === "scanning" && (
                  <p className="text-sm text-gray-400">
                    Point camera at the student&apos;s QR code
                  </p>
                )}
                {/* html5-qrcode mounts video into this div */}
                <div
                  id="qr-reader"
                  className="w-full max-w-sm rounded-2xl overflow-hidden shadow-lg"
                />
              </>
            )}

            {/* ── NFC idle visual ────────────────────────────────────── */}
            {scanMode === "nfc" && status === "idle" && (
              <div className="flex flex-col items-center gap-5">
                <div className="h-32 w-32 rounded-full border-4 border-indigo-100 flex items-center justify-center">
                  <div className="h-20 w-20 rounded-full border-4 border-indigo-200 flex items-center justify-center">
                    <div className="h-10 w-10 rounded-full bg-indigo-400 flex items-center justify-center">
                      <svg
                        className="h-5 w-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="12" r="9" />
                        <circle cx="12" cy="12" r="5" />
                        <circle cx="12" cy="12" r="1.5" fill="white" strokeWidth={0} />
                      </svg>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500 text-center max-w-xs leading-relaxed">
                  Tap <strong>Start Scanner</strong>, then have the student
                  hold their NFC tag near the top of your device.
                </p>
              </div>
            )}

            {/* ── NFC active visual (pulsing rings) ─────────────────── */}
            {scanMode === "nfc" && status === "scanning" && (
              <div className="flex flex-col items-center gap-5">
                <div className="relative h-36 w-36 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-indigo-100 animate-ping opacity-40" />
                  <div className="absolute inset-5 rounded-full bg-indigo-200 animate-ping opacity-50 [animation-delay:200ms]" />
                  <div className="relative h-20 w-20 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg">
                    <svg
                      className="h-8 w-8 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <circle cx="12" cy="12" r="5" />
                      <circle cx="12" cy="12" r="1.5" fill="white" strokeWidth={0} />
                    </svg>
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600">
                  Ready — hold NFC tag near device
                </p>
              </div>
            )}

            {/* Start / Stop buttons */}
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

          {/* ── Bottom toolbar ────────────────────────────────────────────── */}
          <div
            className="shrink-0 bg-white border-t border-gray-100 px-4 pt-3 space-y-2"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            {/* Row 1: status + sync badge */}
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

            {/* Row 2: offline actions */}
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
        </>
      )}

      {/* ── NFC Handover Fast Issuing Modal Overlay ─────────────────────── */}
      {handoverData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-100 text-amber-800">
                NFC Tag Handover
              </span>
              <button
                onClick={handleDismissHandover}
                className="text-gray-400 hover:text-gray-600 text-xs font-medium"
              >
                Skip / Later
              </button>
            </div>

            {handoverSuccess ? (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-bold">
                  ✓
                </div>
                <h4 className="text-sm font-bold text-gray-900">
                  Tag Linked &amp; Handed Over!
                </h4>
                <p className="text-xs text-gray-500">
                  Physical NFC tag is now active for {handoverData.fullName}.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {handoverData.fullName}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Purchased a physical NFC ID Tag. Tap a blank tag now to program and issue it at the door.
                  </p>
                </div>

                <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <circle cx="12" cy="12" r="5" />
                      <circle cx="12" cy="12" r="1.5" fill="currentColor" strokeWidth={0} />
                    </svg>
                  </div>
                  <div className="text-xs text-indigo-950">
                    <p className="font-semibold">
                      {isWritingHandover
                        ? "Hold blank tag near device..."
                        : "Ready to write"}
                    </p>
                    <p className="text-[11px] text-indigo-700">
                      {nfcAvailable ? "Web NFC Enabled" : "Simulation Mode"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDismissHandover}
                    disabled={isWritingHandover}
                    className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition"
                  >
                    Skip for Now
                  </button>
                  <button
                    type="button"
                    onClick={handleIssueHandoverTag}
                    disabled={isWritingHandover}
                    className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition flex items-center justify-center gap-1.5"
                  >
                    {isWritingHandover ? (
                      <span>Writing Tag...</span>
                    ) : (
                      <span>Tap Tag to Issue</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
