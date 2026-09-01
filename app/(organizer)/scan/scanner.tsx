"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  checkInAction,
  loadGuestListAction,
  markNfcIssuedAction,
  sellWalkUpTicketToStudentAction,
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
  | "no_ticket"
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

  // Scenario A: Walk-up at door for existing student without ticket
  const [noTicketData, setNoTicketData] = useState<{
    profileId: string;
    fullName: string;
    eventPrice: number;
    eventTitle: string;
    token: string;
  } | null>(null);
  const [isSellingWalkUp, setIsSellingWalkUp] = useState(false);

  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const nfcAbortRef = useRef<AbortController | null>(null);
  const activeRef = useRef(false); // guards QR double-processing
  const nfcScanningRef = useRef(false); // so handleResult returns to "scanning" for NFC
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
      setNoTicketData(null);
      setStatus("success");
      setMessage(result.fullName);
      if (result.needsNfcHandover) {
        setHandoverData({
          fullName: result.fullName,
          token: result.token,
        });
      }
      setTimeout(() => {
        setStatus(nfcScanningRef.current ? "scanning" : "idle");
        setMessage("");
      }, 3000);
    } else if (result.status === "no_ticket") {
      setStatus("no_ticket");
      setNoTicketData({
        profileId: result.profileId,
        fullName: result.fullName,
        eventPrice: result.eventPrice,
        eventTitle: result.eventTitle,
        token: result.token,
      });
      // Do NOT auto-dismiss immediately so organizer can click "Sell Ticket At Door"
    } else if (result.status === "already_scanned") {
      setNoTicketData(null);
      setStatus("already_scanned");
      setMessage("Already checked in");
      setTimeout(() => {
        setStatus(nfcScanningRef.current ? "scanning" : "idle");
        setMessage("");
      }, 3000);
    } else {
      setNoTicketData(null);
      setStatus("not_found");
      setMessage("Not on guest list");
      setTimeout(() => {
        setStatus(nfcScanningRef.current ? "scanning" : "idle");
        setMessage("");
      }, 3000);
    }
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
            if (record.recordType !== "url" && record.recordType !== "text")
              continue;
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

  const handleSellWalkUpAtDoor = async () => {
    if (!noTicketData) return;
    setIsSellingWalkUp(true);
    try {
      const res = await sellWalkUpTicketToStudentAction({
        profileId: noTicketData.profileId,
        eventId,
        token: noTicketData.token,
      });
      handleResult(res);
    } catch (err: unknown) {
      alert(`Walk-up sale failed: ${(err as Error).message || String(err)}`);
    } finally {
      setIsSellingWalkUp(false);
    }
  };

  const handleDismissNoTicket = () => {
    setNoTicketData(null);
    setStatus(nfcScanningRef.current ? "scanning" : "idle");
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
    no_ticket: "bg-amber-500",
    already_scanned: "bg-yellow-400",
    not_found: "bg-red-500",
    error: "bg-red-500",
  };

  return (
    <div
      className={`flex-1 flex flex-col min-h-0 justify-between transition-colors duration-500 ${statusColors[status]}`}
    >
      {/* ── Scenario A: Recognized Student with No Ticket (Walk-Up Prompt) ─── */}
      {status === "no_ticket" && noTicketData && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-white max-w-sm mx-auto w-full">
          <div className="w-full bg-white rounded-3xl p-6 text-gray-900 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                User Recognized
              </span>
              <h3 className="text-xl font-bold text-gray-900 mt-2">
                {noTicketData.fullName}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                No ticket registered for{" "}
                <span className="font-semibold text-gray-700">
                  {noTicketData.eventTitle}
                </span>
              </p>
            </div>

            <div className="rounded-2xl bg-amber-50 border border-amber-200/80 p-3.5 text-center">
              <p className="text-xs text-amber-900 font-medium">
                Door Ticket Price
              </p>
              <p className="text-2xl font-bold text-amber-950 mt-0.5">
                {noTicketData.eventPrice > 0
                  ? `${noTicketData.eventPrice.toLocaleString()} MMK`
                  : "Free Entry"}
              </p>
              {noTicketData.eventPrice > 0 && (
                <p className="text-[11px] text-amber-700 mt-1">
                  Collect cash before admitting attendee
                </p>
              )}
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleSellWalkUpAtDoor}
                disabled={isSellingWalkUp}
                className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {isSellingWalkUp ? (
                  <span>Processing Sale...</span>
                ) : (
                  <span>Sell Ticket At Door & Admit</span>
                )}
              </button>

              <button
                type="button"
                onClick={handleDismissNoTicket}
                disabled={isSellingWalkUp}
                className="w-full rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition"
              >
                Cancel / Back to Scanner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Result flash (Standard success / already_scanned / not_found) ──── */}
      {status !== "idle" && status !== "scanning" && status !== "no_ticket" && (
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
            <div className="flex gap-1 mx-auto mt-3 sm:mt-4 rounded-xl bg-gray-100 p-1 shrink-0">
              <button
                onClick={() => switchMode("qr")}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                  scanMode === "qr"
                    ? "bg-white text-gray-900 shadow-xs"
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
                className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                  scanMode === "nfc"
                    ? "bg-white text-gray-900 shadow-xs"
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
                  <circle
                    cx="12"
                    cy="12"
                    r="1.5"
                    fill="currentColor"
                    strokeWidth={0}
                  />
                </svg>
                NFC
              </button>
            </div>
          )}

          {/* Main content area */}
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-4 py-4 sm:py-6 gap-4 overflow-y-auto">
            {/* ── QR mode ───────────────────────────────────────────── */}
            {scanMode === "qr" && (
              <>
                {status === "scanning" && (
                  <p className="text-xs sm:text-sm text-gray-400 shrink-0">
                    Point camera at the student&apos;s QR code
                  </p>
                )}
                {/* html5-qrcode mounts video into this div */}
                <div
                  id="qr-reader"
                  className="w-full max-w-xs sm:max-w-sm rounded-2xl overflow-hidden shadow-md shrink-0"
                />
              </>
            )}

            {/* ── NFC idle visual ────────────────────────────────────── */}
            {scanMode === "nfc" && status === "idle" && (
              <div className="flex flex-col items-center gap-4">
                <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-full border-4 border-indigo-100 flex items-center justify-center">
                  <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-4 border-indigo-200 flex items-center justify-center">
                    <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-indigo-400 flex items-center justify-center">
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
                        <circle
                          cx="12"
                          cy="12"
                          r="1.5"
                          fill="white"
                          strokeWidth={0}
                        />
                      </svg>
                    </div>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 text-center max-w-xs leading-relaxed">
                  Tap <strong>Start Scanner</strong>, then have the student hold
                  their NFC tag near the top of your device.
                </p>
              </div>
            )}

            {/* ── NFC active visual (pulsing rings) ─────────────────── */}
            {scanMode === "nfc" && status === "scanning" && (
              <div className="flex flex-col items-center gap-4">
                <div className="relative h-28 w-28 sm:h-36 sm:w-36 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-indigo-100 animate-ping opacity-40" />
                  <div className="absolute inset-4 sm:inset-5 rounded-full bg-indigo-200 animate-ping opacity-50 [animation-delay:200ms]" />
                  <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg">
                    <svg
                      className="h-7 w-7 sm:h-8 sm:w-8 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <circle cx="12" cy="12" r="5" />
                      <circle
                        cx="12"
                        cy="12"
                        r="1.5"
                        fill="white"
                        strokeWidth={0}
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Ready — hold NFC tag near device
                </p>
              </div>
            )}

            {/* Start / Stop buttons */}
            {status === "idle" && (
              <button
                onClick={startScanner}
                className="w-full max-w-xs sm:max-w-sm rounded-2xl bg-indigo-600 px-6 py-3.5 sm:py-4 text-base font-semibold text-white hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md shrink-0"
              >
                Start Scanner
              </button>
            )}

            {status === "scanning" && (
              <button
                onClick={stopScanner}
                className="w-full max-w-xs sm:max-w-sm rounded-2xl border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 active:scale-[0.98] transition-all shrink-0"
              >
                Stop Scanner
              </button>
            )}
          </div>

          {/* ── Bottom toolbar ────────────────────────────────────────────── */}
          <div
            className="shrink-0 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 pt-3.5 space-y-2.5 transition-colors shadow-xs"
            style={{
              paddingBottom: "max(0.875rem, env(safe-area-inset-bottom))",
            }}
          >
            <div className="max-w-md mx-auto space-y-2.5">
              {/* Row 1: status chips + sync badge */}
              <div className="flex items-center justify-between gap-2">
                {/* Left: Cache Mode Pill */}
                <div>
                  {offlineEnabled ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-indigo-50 text-indigo-700 border-indigo-200">
                      <svg
                        className="w-3 h-3 text-indigo-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                        />
                      </svg>
                      <span className="font-semibold text-[11px]">
                        Offline Cached
                      </span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      <span className="font-medium text-[11px]">Live Mode</span>
                    </div>
                  )}
                </div>

                {/* Right: Pending Sync Button */}
                {pendingCount > 0 && (
                  <button
                    onClick={handleManualSync}
                    disabled={!isOnline || isSyncing}
                    title={
                      isOnline
                        ? "Click to sync pending check-ins now"
                        : "Stored locally. Will sync automatically when back online."
                    }
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                      isOnline
                        ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 active:scale-95 cursor-pointer shadow-2xs"
                        : "bg-gray-100 text-gray-600 border-gray-200 cursor-default"
                    }`}
                  >
                    <svg
                      className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-amber-700" : "text-amber-600"}`}
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
                      {isSyncing ? "Syncing…" : `${pendingCount} Unsynced`}
                    </span>
                  </button>
                )}
              </div>

              {/* Row 2: Offline Actions */}
              {isOnline && !offlineEnabled && (
                <button
                  onClick={downloadGuestList}
                  disabled={isLoading}
                  className="w-full rounded-xl border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 active:scale-[0.99] px-4 py-2.5 text-xs sm:text-sm font-semibold text-indigo-700 disabled:opacity-50 transition shadow-2xs flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="w-4 h-4 animate-spin text-indigo-600"
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
                      <span>Downloading guest list…</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4 text-indigo-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      <span>Download Guest List for Offline Mode</span>
                    </>
                  )}
                </button>
              )}

              {offlineEnabled && isOnline && (
                <div className="flex gap-2">
                  <button
                    onClick={downloadGuestList}
                    disabled={isLoading}
                    className="flex-1 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98] px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-50 transition shadow-2xs flex items-center justify-center gap-1.5"
                  >
                    <svg
                      className={`w-3.5 h-3.5 text-gray-500 ${isLoading ? "animate-spin text-indigo-600" : ""}`}
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
                    <span>{isLoading ? "Refreshing…" : "Refresh List"}</span>
                  </button>
                  <button
                    onClick={disableOfflineMode}
                    className="flex-1 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 active:scale-[0.98] px-3 py-2 text-xs font-semibold text-indigo-700 transition shadow-2xs flex items-center justify-center gap-1.5"
                  >
                    <svg
                      className="w-3.5 h-3.5 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    <span>Switch to Live</span>
                  </button>
                </div>
              )}

              {!isOnline && (
                <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-center text-xs font-medium text-amber-800 flex items-center justify-center gap-1.5">
                  <svg
                    className="w-3.5 h-3.5 text-amber-600 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>
                    Operating offline. Scans are queued and will sync when back online.
                  </span>
                </div>
              )}
            </div>
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
                    Purchased a physical NFC ID Tag. Tap a blank tag now to
                    program and issue it at the door.
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
                      <circle
                        cx="12"
                        cy="12"
                        r="1.5"
                        fill="currentColor"
                        strokeWidth={0}
                      />
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
