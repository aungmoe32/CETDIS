"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
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
  saveProfiles,
  saveEventMeta,
  getPendingSyncs,
  hasCachedTickets,
  markNfcIssuedLocally,
  addToSyncQueue,
  wipeOfflineDatabase,
} from "@/lib/idb";
import {
  playSuccessSound,
  playAlreadyScannedSound,
  playErrorSound,
  playWalkUpSound,
  isSoundMuted,
  toggleSound,
  unlockAudioContext,
} from "@/lib/sound";
import type { CheckInResult } from "./actions";

interface Props {
  eventId: string;
  maxCapacity?: number;
  initialCheckedIn?: number;
  initialTotalRegistered?: number;
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

export default function Scanner({
  eventId,
  maxCapacity = 0,
  initialCheckedIn = 0,
  initialTotalRegistered = 0,
}: Props) {
  const [capacity, setCapacity] = useState(maxCapacity);
  const [checkedInCount, setCheckedInCount] = useState(initialCheckedIn);
  const [totalRegisteredCount, setTotalRegisteredCount] = useState(initialTotalRegistered);
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
  const [soundMuted, setSoundMuted] = useState(false);
  const [downloadModal, setDownloadModal] = useState<{
    isOpen: boolean;
    type: "success" | "error";
    title: string;
    message?: string;
    attendeesCount?: number;
    profilesCount?: number;
  } | null>(null);

  // Scenario A: Walk-up at door for existing student without ticket
  const [noTicketData, setNoTicketData] = useState<{
    profileId: string;
    fullName: string;
    eventPrice: number;
    eventTitle: string;
    token: string;
  } | null>(null);
  const [isSellingWalkUp, setIsSellingWalkUp] = useState(false);
  const [isWipingCache, setIsWipingCache] = useState(false);
  const [alreadyScannedData, setAlreadyScannedData] = useState<{
    fullName: string;
    scannedAt?: string | null;
  } | null>(null);

  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const nfcAbortRef = useRef<AbortController | null>(null);
  const activeRef = useRef(false); // guards QR double-processing
  const nfcScanningRef = useRef(false); // so handleResult returns to "scanning" for NFC
  const successTimerRef = useRef<NodeJS.Timeout | null>(null);
  const alreadyScannedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isOnlineRef = useRef(true);
  const offlineEnabledRef = useRef(false);
  const localHandledTicketsRef = useRef<Set<string>>(new Set());

  // Keep state synchronized with server props
  useEffect(() => {
    setCheckedInCount(initialCheckedIn);
  }, [initialCheckedIn]);

  useEffect(() => {
    setTotalRegisteredCount(initialTotalRegistered);
  }, [initialTotalRegistered]);

  useEffect(() => {
    setCapacity(maxCapacity);
  }, [maxCapacity]);

  // ── Multi-Scanner Realtime Sync ───────────────────────────────────────────
  useEffect(() => {
    if (!eventId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`scanner-tickets-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const ticketId =
            (payload.new as { id?: string })?.id ||
            (payload.old as { id?: string })?.id;

          // If this scan or walk-up was performed by this device, ignore to avoid double counting
          if (ticketId && localHandledTicketsRef.current.has(ticketId)) {
            return;
          }

          if (payload.eventType === "INSERT") {
            const newRow = payload.new as { id?: string; is_checked_in?: boolean };
            setTotalRegisteredCount((prev) => prev + 1);
            if (newRow?.is_checked_in) {
              setCheckedInCount((prev) => prev + 1);
            }
          } else if (payload.eventType === "UPDATE") {
            const newRow = payload.new as { id?: string; is_checked_in?: boolean };
            const oldRow = payload.old as { id?: string; is_checked_in?: boolean };
            if (newRow?.is_checked_in && !oldRow?.is_checked_in) {
              setCheckedInCount((prev) => prev + 1);
            } else if (!newRow?.is_checked_in && oldRow?.is_checked_in) {
              setCheckedInCount((prev) => Math.max(0, prev - 1));
            }
          } else if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id?: string; is_checked_in?: boolean };
            setTotalRegisteredCount((prev) => Math.max(0, prev - 1));
            if (oldRow?.is_checked_in) {
              setCheckedInCount((prev) => Math.max(0, prev - 1));
            }
          }
        },
      )
      .subscribe((status, err) => {
        if (err) {
          console.warn("[Scanner Realtime] status:", status, err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  // ── Detect NFC on mount ───────────────────────────────────────────────────
  useEffect(() => {
    setNfcAvailable("NDEFReader" in window);
    setSoundMuted(isSoundMuted());
  }, []);

  // ── Network + bootstrap effect ────────────────────────────────────────────
  useEffect(() => {
    const online = navigator.onLine;
    setIsOnline(online);
    isOnlineRef.current = online;

    const triggerSync = async () => {
      setIsSyncing(true);
      const startTime = Date.now();
      try {
        await flushSyncQueue();
        const q = await getPendingSyncs();
        setPendingCount(q.length);
      } catch (err) {
        console.error("Auto sync failed", err);
      } finally {
        const elapsed = Date.now() - startTime;
        if (elapsed < 700) {
          await new Promise((resolve) => setTimeout(resolve, 700 - elapsed));
        }
        setIsSyncing(false);
      }
    };

    if (online) triggerSync();
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
      triggerSync();
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
      playSuccessSound();
      if (result.ticketId) {
        localHandledTicketsRef.current.add(result.ticketId);
      }
      setCheckedInCount((prev) => prev + 1);
      setNoTicketData(null);
      setStatus("success");
      setMessage(result.fullName || "Student Attendee");
      if (result.needsNfcHandover) {
        setHandoverData({
          fullName: result.fullName,
          token: result.token,
        });
      }
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = setTimeout(() => {
        setStatus(nfcScanningRef.current ? "scanning" : "idle");
        setMessage("");
        successTimerRef.current = null;
      }, 3500);
    } else if (result.status === "no_ticket") {
      playWalkUpSound();
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
      playAlreadyScannedSound();
      setNoTicketData(null);
      setStatus("already_scanned");
      const attendeeName = result.fullName || message || "Student Attendee";
      setMessage(attendeeName);
      setAlreadyScannedData({
        fullName: attendeeName,
        scannedAt: result.scannedAt || null,
      });
      if (alreadyScannedTimerRef.current) {
        clearTimeout(alreadyScannedTimerRef.current);
      }
      alreadyScannedTimerRef.current = setTimeout(() => {
        setStatus(nfcScanningRef.current ? "scanning" : "idle");
        setMessage("");
        setAlreadyScannedData(null);
        alreadyScannedTimerRef.current = null;
      }, 4000);
    } else {
      playErrorSound();
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
        handleResult({
          status: "already_scanned",
          fullName: localTicket.full_name,
          token,
        });
        getPendingSyncs().then((q) => setPendingCount(q.length));
        return;
      }

      if (!isOnlineRef.current || offlineEnabledRef.current) {
        // OFFLINE path
        const result = await offlineCheckIn(token, eventId);
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
    unlockAudioContext();
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
        setDownloadModal({
          isOpen: true,
          type: "error",
          title: "Download Failed",
          message: result.error,
        });
      } else if (result.data) {
        await saveGuestList(result.data);
        const checkedIn = result.data.filter((t) => t.is_checked_in).length;
        setCheckedInCount(checkedIn);
        setTotalRegisteredCount(result.data.length);
        if (result.eventMeta) {
          await saveEventMeta(result.eventMeta);
          if (result.eventMeta.maxCapacity) {
            setCapacity(result.eventMeta.maxCapacity);
          }
        }
        if (result.profiles) {
          await saveProfiles(result.profiles);
        }
        offlineEnabledRef.current = true;
        setOfflineEnabled(true);
        setDownloadModal({
          isOpen: true,
          type: "success",
          title: "Guest List & Directory Ready",
          attendeesCount: result.data.length,
          profilesCount: result.profiles?.length ?? 0,
        });
      }
    } catch {
      setDownloadModal({
        isOpen: true,
        type: "error",
        title: "Connection Failed",
        message:
          "Network error: could not connect to the server. Check your connection and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const disableOfflineMode = () => {
    offlineEnabledRef.current = false;
    setOfflineEnabled(false);
  };

  const handleResetOfflineCache = async () => {
    if (
      !window.confirm(
        "Reset & clear local offline database for this device?\n(Useful between showcase sessions)",
      )
    ) {
      return;
    }
    setIsWipingCache(true);
    try {
      await wipeOfflineDatabase();
      setOfflineEnabled(false);
      offlineEnabledRef.current = false;
      setPendingCount(0);
      window.location.reload();
    } catch (err) {
      alert(
        "Failed to wipe offline database: " +
          ((err as Error)?.message || String(err)),
      );
      setIsWipingCache(false);
    }
  };

  const handleManualSync = async () => {
    if (isSyncing || !isOnline) return;
    setIsSyncing(true);
    const startTime = Date.now();
    try {
      await flushSyncQueue();
      const remaining = await getPendingSyncs();
      setPendingCount(remaining.length);
    } catch (err) {
      console.error("Manual sync failed", err);
    } finally {
      const elapsed = Date.now() - startTime;
      if (elapsed < 700) {
        await new Promise((resolve) => setTimeout(resolve, 700 - elapsed));
      }
      setIsSyncing(false);
    }
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

      playSuccessSound();
      setHandoverSuccess(true);
      setTimeout(() => {
        setHandoverData(null);
        setHandoverSuccess(false);
      }, 1500);
    } catch (err: unknown) {
      playErrorSound();
      alert(`NFC Write Failed: ${(err as Error).message || String(err)}`);
    } finally {
      setIsWritingHandover(false);
    }
  };

  const handleSellWalkUpAtDoor = async () => {
    if (!noTicketData) return;
    setIsSellingWalkUp(true);
    try {
      if (!isOnlineRef.current || offlineEnabledRef.current) {
        // OFFLINE Walk-Up Sale
        const tempTicketId = `walkup_${crypto.randomUUID()}`;
        const scannedAt = new Date().toISOString();

        // 1. Put into local cached_tickets so subsequent scans show "already_scanned"
        await upsertTicket({
          ticket_id: tempTicketId,
          event_id: eventId,
          check_in_token: noTicketData.token,
          full_name: noTicketData.fullName,
          is_checked_in: true,
        });

        // 2. Add to sync_queue
        await addToSyncQueue({
          ticket_id: tempTicketId,
          type: "walkup_sale",
          token: noTicketData.token,
          event_id: eventId,
          profile_id: noTicketData.profileId,
          amount_collected: noTicketData.eventPrice,
          scanned_at: scannedAt,
          sync_status: "pending",
        });

        // 3. Update pending count
        const pending = await getPendingSyncs();
        setPendingCount(pending.length);

        // 4. Trigger success result for instant check-in
        setTotalRegisteredCount((prev) => prev + 1);
        handleResult({
          status: "success",
          fullName: noTicketData.fullName,
          ticketId: tempTicketId,
          token: noTicketData.token,
        });
      } else {
        const res = await sellWalkUpTicketToStudentAction({
          profileId: noTicketData.profileId,
          eventId,
          token: noTicketData.token,
        });
        if (res.status === "success") {
          setTotalRegisteredCount((prev) => prev + 1);
          if (res.ticketId) {
            localHandledTicketsRef.current.add(res.ticketId);
          }
        }
        handleResult(res);
      }
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

  const handleDismissSuccess = () => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    setStatus(nfcScanningRef.current ? "scanning" : "idle");
    setMessage("");
  };

  const handleDismissAlreadyScanned = () => {
    if (alreadyScannedTimerRef.current) {
      clearTimeout(alreadyScannedTimerRef.current);
      alreadyScannedTimerRef.current = null;
    }
    setStatus(nfcScanningRef.current ? "scanning" : "idle");
    setMessage("");
    setAlreadyScannedData(null);
  };

  const handleDismissHandover = () => {
    setHandoverData(null);
    setHandoverSuccess(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const statusColors: Record<ScanStatus, string> = {
    idle: "bg-white",
    scanning: "bg-white",
    success: "bg-emerald-600",
    no_ticket: "bg-amber-600",
    already_scanned: "bg-amber-500",
    not_found: "bg-rose-600",
    error: "bg-rose-600",
  };

  return (
    <div
      className={`flex-1 flex flex-col min-h-0 justify-between transition-colors duration-500 ${statusColors[status]}`}
    >
      {/* ── Scenario A: Recognized Student with No Ticket (Walk-Up Prompt) ─── */}
      {status === "no_ticket" && noTicketData && (
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 text-white max-w-sm mx-auto w-full animate-in zoom-in-95 duration-200">
          <div className="w-full bg-white rounded-3xl p-6 sm:p-7 text-gray-900 shadow-2xl border border-amber-200/50 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-2xs">
              <svg
                className="w-7 h-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-dingos-bold">
                Student Recognized
              </span>
              <h3 className="text-xl font-bold text-gray-900 mt-2 font-dingos-bold">
                {noTicketData.fullName}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                No ticket registered for{" "}
                <span className="font-semibold text-gray-700">
                  {noTicketData.eventTitle}
                </span>
              </p>
            </div>

            <div className="rounded-2xl bg-amber-50/80 border border-amber-200/80 p-4 text-center">
              <p className="text-xs text-amber-900 font-bold uppercase tracking-wider font-dingos-bold">
                Door Ticket Price
              </p>
              <p className="font-dingos-bold text-md sm:text-md text-amber-950 tracking-wide mt-1">
                {noTicketData.eventPrice > 0
                  ? `${noTicketData.eventPrice.toLocaleString()} MMK`
                  : "Free Entry"}
              </p>
              {noTicketData.eventPrice > 0 && (
                <p className="text-[11px] text-amber-700 mt-1 font-medium">
                  Collect cash before admitting attendee
                </p>
              )}
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleSellWalkUpAtDoor}
                disabled={isSellingWalkUp}
                className="w-full rounded-full bg-indigo-600 py-3 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition flex items-center justify-center gap-2 font-dingos-bold tactile-btn"
              >
                {isSellingWalkUp ? (
                  <span>Processing Sale...</span>
                ) : (
                  <span>Sell Ticket At Door &amp; Admit</span>
                )}
              </button>

              <button
                type="button"
                onClick={handleDismissNoTicket}
                disabled={isSellingWalkUp}
                className="w-full rounded-full border border-gray-200 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 active:scale-95 disabled:opacity-50 transition font-dingos-bold"
              >
                Cancel / Back to Scanner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Scenario B: Successful Check-In Dialog Card (Displays Attendee Name) ─── */}
      {status === "success" && (
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 text-white max-w-sm mx-auto w-full animate-in zoom-in-95 duration-200 select-none">
          <div className="w-full bg-white rounded-3xl p-6 sm:p-7 text-gray-900 shadow-2xl border border-emerald-100 space-y-4 text-center">
            {/* Emerald Checkmark Badge */}
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
              <svg
                className="w-9 h-9"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-full font-dingos-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Check-in Verified
              </span>
              <h3 className="text-2xl font-bold text-gray-900 mt-2 font-dingos-bold tracking-tight">
                {message || "Student Attendee"}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Attendee admitted to event
              </p>
            </div>

            {/* Check-in timestamp pill & Hall capacity context */}
            <div className="rounded-2xl bg-emerald-50/70 border border-emerald-100/80 p-3 text-center space-y-1">
              <p className="text-[11px] text-emerald-800 font-bold font-dingos-bold flex items-center justify-center gap-1.5">
                <svg
                  className="w-3.5 h-3.5 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <circle cx="12" cy="12" r="10" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6l4 2"
                  />
                </svg>
                <span>
                  Checked in at{" "}
                  {new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </p>
              {capacity > 0 && (
                <p className="text-[10px] text-emerald-700 font-medium">
                  Hall Occupancy:{" "}
                  <strong className="font-dingos-bold text-emerald-950">
                    {checkedInCount} / {capacity}
                  </strong>{" "}
                  ({Math.min(100, Math.round((checkedInCount / capacity) * 100))}%)
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleDismissSuccess}
              className="w-full rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white py-3 text-xs sm:text-sm font-bold transition shadow-xs font-dingos-bold tactile-btn flex items-center justify-center gap-1.5"
            >
              <span>Next Scan / Done</span>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Scenario C: Already Checked-In Dialog Card (Displays Attendee Name) ─── */}
      {status === "already_scanned" && (
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 text-white max-w-sm mx-auto w-full animate-in zoom-in-95 duration-200 select-none">
          <div className="w-full bg-white rounded-3xl p-6 sm:p-7 text-gray-900 shadow-2xl border border-amber-200 space-y-4 text-center">
            {/* Amber Warning Badge */}
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
              <svg
                className="w-9 h-9"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <div>
              {/* <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-3 py-0.5 rounded-full font-dingos-bold">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                Duplicate Entry Blocked
              </span> */}
              <h3 className="text-2xl font-bold text-gray-900 mt-2 font-dingos-bold tracking-tight">
                {alreadyScannedData?.fullName || message || "Student Attendee"}
              </h3>
              <p className="text-xs text-amber-700 font-medium mt-0.5">
                Pass already scanned &amp; admitted
              </p>
            </div>

            {/* Check-in timestamp pill */}
            <div className="rounded-2xl bg-amber-50/80 border border-amber-200/80 p-3 text-center">
              <p className="text-[11px] text-amber-900 font-bold font-dingos-bold flex items-center justify-center gap-1.5">
                <svg
                  className="w-3.5 h-3.5 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <circle cx="12" cy="12" r="10" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6l4 2"
                  />
                </svg>
                <span>
                  {alreadyScannedData?.scannedAt ? (
                    <>
                      First admitted at{" "}
                      {new Date(
                        alreadyScannedData.scannedAt,
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </>
                  ) : (
                    "Already admitted earlier today"
                  )}
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleDismissAlreadyScanned}
              className="w-full rounded-full bg-amber-600 hover:bg-amber-700 active:scale-95 text-white py-3 text-xs sm:text-sm font-bold transition shadow-xs font-dingos-bold tactile-btn flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Next Scan / Dismiss</span>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Result flash (not_found / error) ──── */}
      {status !== "idle" &&
        status !== "scanning" &&
        status !== "no_ticket" &&
        status !== "success" &&
        status !== "already_scanned" && (
          <div className="flex-1 flex flex-col items-center justify-center px-8 gap-3">
            <span className="text-7xl font-bold text-white leading-none">
              ✗
            </span>
            {status === "not_found" && (
              <p className="text-white/90 text-xl font-bold font-dingos-bold text-center">
                Not on Guest List
              </p>
            )}
            {status === "error" && (
              <p className="text-white/90 text-xl font-bold font-dingos-bold text-center">
                {message || "Scan Error"}
              </p>
            )}
          </div>
        )}

      {/* ── Scanner state ─────────────────────────────────────────────────── */}
      {(status === "idle" || status === "scanning") && (
        <>
          {/* ── Real-Time Door Attendance & Hall Capacity Bar ────────────────── */}
          <div className="w-full max-w-sm sm:max-w-md mx-auto mt-2 px-3 sm:px-0 shrink-0 select-none">
            <div className="bg-white rounded-2xl border border-gray-200/90 p-3 sm:p-3.5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                {/* Left: Admitted counter */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-gray-900 font-dingos-bold block leading-tight">
                      <span className="text-emerald-700 text-sm font-extrabold">{checkedInCount}</span> Admitted at Door
                    </span>
                    {totalRegisteredCount > 0 && (
                      <span className="text-[10px] text-gray-500 truncate block">
                        of {totalRegisteredCount} registered attendees
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Hall Capacity badge */}
                {capacity > 0 && (
                  <div className="text-right shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full font-dingos-bold ${
                        checkedInCount >= capacity
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : checkedInCount / capacity >= 0.8
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                      }`}
                    >
                      <span>{checkedInCount} / {capacity}</span>
                      <span className="text-[9px] opacity-80">
                        ({Math.min(100, Math.round((checkedInCount / capacity) * 100))}%)
                      </span>
                    </span>
                    <span className="text-[9px] text-gray-400 block mt-0.5">
                      {Math.max(0, capacity - checkedInCount)} spots left
                    </span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {capacity > 0 && (
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      checkedInCount >= capacity
                        ? "bg-rose-500"
                        : checkedInCount / capacity >= 0.8
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{
                      width: `${Math.min(100, Math.round((checkedInCount / capacity) * 100))}%`,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
          {/* Mode tabs — only shown on devices that support NFC */}
          {nfcAvailable && status === "idle" && (
            <div className="flex gap-1 mx-auto mt-3 sm:mt-4 rounded-full bg-gray-100 p-1 shrink-0 select-none">
              <button
                onClick={() => switchMode("qr")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-all tactile-btn font-dingos-bold ${
                  scanMode === "qr"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <path
                    d="M14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2h-2"
                    strokeLinecap="round"
                  />
                </svg>
                <span>QR Code</span>
              </button>
              <button
                onClick={() => switchMode("nfc")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-all tactile-btn font-dingos-bold ${
                  scanMode === "nfc"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <svg
                  className="h-3.5 w-3.5"
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
                    fill="currentColor"
                    strokeWidth={0}
                  />
                </svg>
                <span>NFC Tag</span>
              </button>
            </div>
          )}

          {/* Main content area */}
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-4 py-4 sm:py-6 gap-4 overflow-y-auto">
            {/* ── QR mode ───────────────────────────────────────────── */}
            {scanMode === "qr" && (
              <>
                {status === "scanning" && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-bold font-dingos-bold shrink-0 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                    <span>Point camera at student QR code</span>
                  </div>
                )}
                {/* html5-qrcode mounts video into this div */}
                <div className="relative w-full max-w-xs sm:max-w-sm shrink-0">
                  <div
                    id="qr-reader"
                    className="w-full rounded-3xl overflow-hidden shadow-md border-gray-100 bg-black"
                  />
                </div>
              </>
            )}

            {/* ── NFC idle visual ────────────────────────────────────── */}
            {scanMode === "nfc" && status === "idle" && (
              <div className="flex flex-col items-center gap-4">
                <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-full border-4 border-indigo-100 flex items-center justify-center shadow-2xs">
                  <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-4 border-indigo-200 flex items-center justify-center">
                    <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-indigo-500 flex items-center justify-center shadow-xs">
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
                  Tap{" "}
                  <strong className="font-dingos-bold text-gray-800">
                    Start Scanner
                  </strong>
                  , then hold the student&apos;s NFC credential near the device
                  antenna.
                </p>
              </div>
            )}

            {/* ── NFC active visual (pulsing rings) ─────────────────── */}
            {scanMode === "nfc" && status === "scanning" && (
              <div className="flex flex-col items-center gap-4">
                <div className="relative h-28 w-28 sm:h-36 sm:w-36 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-indigo-100 animate-ping opacity-40" />
                  <div className="absolute inset-4 sm:inset-5 rounded-full bg-indigo-200 animate-ping opacity-50 [animation-delay:200ms]" />
                  <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg">
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
                <p className="text-xs sm:text-sm font-bold text-gray-700 font-dingos-bold">
                  Ready — hold NFC tag near device
                </p>
              </div>
            )}

            {/* Start / Stop buttons */}
            {status === "idle" && (
              <button
                onClick={startScanner}
                className="w-full max-w-xs sm:max-w-sm inline-flex items-center justify-center gap-2.5 rounded-full bg-indigo-600 px-6 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-white hover:bg-indigo-700 active:scale-95 transition shadow-xs hover:shadow-md font-dingos-bold shrink-0 tactile-btn"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2.2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 7V5a2 2 0 012-2h2m10 0h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"
                  />
                </svg>
                <span>Start Scanner</span>
              </button>
            )}

            {status === "scanning" && (
              <button
                onClick={stopScanner}
                className="w-full max-w-xs sm:max-w-sm inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3 text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-50 active:scale-95 transition shadow-2xs font-dingos-bold shrink-0 tactile-btn"
              >
                <svg
                  className="w-4 h-4 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                >
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
                <span>Stop Scanner</span>
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
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                {/* Left: Cache Mode Pill & Audio Toggle */}
                <div className="flex items-center gap-2">
                  {offlineEnabled ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-indigo-50 text-indigo-700 border-indigo-200 font-dingos-bold">
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
                      <span className="text-[11px]">Offline Cached</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-gray-500 bg-gray-50 border border-gray-200/80 font-dingos-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[11px]">Live Mode</span>
                    </div>
                  )}

                  {/* Sound Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setSoundMuted(toggleSound())}
                    title={
                      soundMuted
                        ? "Unmute check-in sounds"
                        : "Mute check-in sounds"
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border border-gray-200/80 bg-white hover:bg-gray-50 active:scale-95 text-gray-600 transition shadow-2xs tactile-btn font-dingos-bold cursor-pointer"
                  >
                    {soundMuted ? (
                      <>
                        <svg
                          className="w-3.5 h-3.5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.414 0-.75-.336-.75-.75V9.75c0-.414.336-.75.75-.75h4.49z"
                          />
                        </svg>
                        <span className="text-[11px] text-gray-500">Muted</span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-3.5 h-3.5 text-emerald-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.414 0-.75-.336-.75-.75V9.75c0-.414.336-.75.75-.75h2.24z"
                          />
                        </svg>
                        <span className="text-[11px] text-emerald-700">
                          Audio
                        </span>
                      </>
                    )}
                  </button>

                  {/* Reset Offline Cache Button (1-Tap for Mobile Demos) */}
                  <button
                    type="button"
                    onClick={handleResetOfflineCache}
                    disabled={isWipingCache}
                    title="Wipe local IndexedDB database on this phone & refresh (useful between showcase sessions)"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border border-gray-200/80 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-gray-600 active:scale-95 transition shadow-2xs tactile-btn font-dingos-bold cursor-pointer"
                  >
                    <svg
                      className={`w-3.5 h-3.5 ${isWipingCache ? "animate-spin text-rose-600" : "text-gray-400 group-hover:text-rose-600"}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    <span className="text-[11px]">
                      {isWipingCache ? "Clearing…" : "Reset"}
                    </span>
                  </button>
                </div>

                {/* Right: Pending Sync Button with rotating animation */}
                {/* {(pendingCount > 0 || isSyncing) && (
                  <button
                    onClick={handleManualSync}
                    disabled={!isOnline || isSyncing}
                    title={
                      isOnline
                        ? "Click to sync pending check-ins now"
                        : "Stored locally. Will sync automatically when back online."
                    }
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition tactile-btn font-dingos-bold ${
                      isOnline
                        ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 active:scale-95 cursor-pointer shadow-2xs"
                        : "bg-gray-100 text-gray-600 border-gray-200 cursor-default"
                    }`}
                  >
                    <svg
                      className={`h-3.5 w-3.5 transition-transform ${isSyncing ? "animate-spin text-amber-700" : "text-amber-600"}`}
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
                    {pendingCount > 0 && (
                      <span className="font-bebas text-sm text-amber-900 tracking-wide">
                        {pendingCount}
                      </span>
                    )}
                    <span>{isSyncing ? "Syncing…" : "Unsynced"}</span>
                  </button>
                )} */}
              </div>

              {/* Row 2: Offline Actions */}
              {isOnline && !offlineEnabled && (
                <button
                  onClick={downloadGuestList}
                  disabled={isLoading}
                  className="w-full rounded-full border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 active:scale-95 px-4 py-2.5 text-xs sm:text-sm font-bold text-indigo-700 disabled:opacity-50 transition shadow-2xs flex items-center justify-center gap-2 font-dingos-bold tactile-btn"
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
                    className="flex-1 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:scale-95 px-3 py-2 text-xs font-bold text-gray-700 disabled:opacity-50 transition shadow-2xs flex items-center justify-center gap-1.5 font-dingos-bold tactile-btn"
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
                    className="flex-1 rounded-full border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 active:scale-95 px-3 py-2 text-xs font-bold text-emerald-700 transition shadow-2xs flex items-center justify-center gap-1.5 font-dingos-bold tactile-btn"
                  >
                    <svg
                      className="w-3.5 h-3.5 text-emerald-600"
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
                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 px-3.5 py-2.5 text-center text-xs font-medium text-amber-800 flex items-center justify-center gap-1.5">
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
                    Operating offline. Scans are queued and will sync when back
                    online.
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
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-100 text-amber-800 font-dingos-bold">
                NFC Tag Handover
              </span>
              <button
                onClick={handleDismissHandover}
                className="text-gray-400 hover:text-gray-600 text-xs font-bold font-dingos-bold"
              >
                Skip / Later
              </button>
            </div>

            {handoverSuccess ? (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-bold shadow-2xs">
                  ✓
                </div>
                <h4 className="text-base font-bold text-gray-900 font-dingos-bold">
                  Tag Linked &amp; Handed Over!
                </h4>
                <p className="text-xs text-gray-500">
                  Physical NFC tag is now active for {handoverData.fullName}.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 font-dingos-bold">
                    {handoverData.fullName}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Purchased a physical NFC ID Tag. Tap a blank tag now to
                    program and issue it at the door.
                  </p>
                </div>

                <div className="rounded-2xl bg-indigo-50/80 border border-indigo-100 p-4 flex items-center gap-3">
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
                    <p className="font-bold font-dingos-bold">
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
                    className="flex-1 rounded-full border border-gray-200 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 active:scale-95 disabled:opacity-50 transition font-dingos-bold"
                  >
                    Skip for Now
                  </button>
                  <button
                    type="button"
                    onClick={handleIssueHandoverTag}
                    disabled={isWritingHandover}
                    className="flex-1 rounded-full bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition flex items-center justify-center gap-1.5 font-dingos-bold tactile-btn"
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

      {/* ── Offline Guest List Download Result Dialog Modal ───────────────── */}
      {downloadModal?.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 select-none"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-gray-100 space-y-4 animate-in zoom-in-95 duration-150 relative">
            {downloadModal.type === "success" ? (
              <div className="text-center space-y-4">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100/80 text-emerald-600 flex items-center justify-center shadow-2xs">
                  <svg
                    className="w-7 h-7"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2.2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900 font-dingos-bold tracking-tight">
                    {downloadModal.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Event roster and campus student identities are saved to
                    local IndexedDB.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-left">
                  <div className="rounded-2xl bg-emerald-50/70 border border-emerald-100/80 p-3 text-center">
                    <div className="font-bebas text-2xl text-emerald-900 leading-none">
                      {downloadModal.attendeesCount ?? 0}
                    </div>
                    <div className="text-[11px] font-bold text-emerald-700 font-dingos-bold mt-1">
                      Event Attendees
                    </div>
                  </div>
                  <div className="rounded-2xl bg-indigo-50/70 border border-indigo-100/80 p-3 text-center">
                    <div className="font-bebas text-2xl text-indigo-900 leading-none">
                      {downloadModal.profilesCount ?? 0}
                    </div>
                    <div className="text-[11px] font-bold text-indigo-700 font-dingos-bold mt-1">
                      Campus Directory
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 text-gray-600 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-left font-medium">
                    Door scanning works 100% offline with zero internet access.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setDownloadModal(null)}
                  className="w-full rounded-full bg-gray-900 hover:bg-black text-white py-3 text-xs sm:text-sm font-bold active:scale-95 transition shadow-sm font-dingos-bold tactile-btn"
                >
                  Start Scanning
                </button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shadow-2xs">
                  <svg
                    className="w-7 h-7"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2.2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                    />
                  </svg>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900 font-dingos-bold tracking-tight">
                    {downloadModal.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {downloadModal.message ||
                      "An error occurred while downloading the guest list."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setDownloadModal(null)}
                  className="w-full rounded-full bg-gray-900 hover:bg-black text-white py-3 text-xs sm:text-sm font-bold active:scale-95 transition shadow-sm font-dingos-bold tactile-btn"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
