"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { checkInAction, loadGuestListAction } from "./actions";
import { offlineCheckIn } from "@/lib/offline-checkin";
import { flushSyncQueue } from "@/lib/sync";
import { saveGuestList } from "@/lib/idb";
import type { CheckInResult } from "./actions";

interface Props {
  eventId: string;
}

type ScanStatus = "idle" | "scanning" | "success" | "already_scanned" | "not_found" | "error";

export default function Scanner({ eventId }: Props) {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [message, setMessage] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [offlineEnabled, setOfflineEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

        // Use refs — not the closed-over state — so we always read the
        // current online/offlineEnabled values at the moment of scan.
        if (!isOnlineRef.current || offlineEnabledRef.current) {
          const result = await offlineCheckIn(token);
          handleResult(result as CheckInResult);
        } else {
          const result = await checkInAction(token, eventId);
          handleResult(result);
        }
      },
      undefined,
    );
  }, [eventId, handleResult]); // isOnline/offlineEnabled intentionally omitted — read via refs

  const enableOfflineMode = async () => {
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

  const statusColors: Record<ScanStatus, string> = {
    idle: "bg-gray-50",
    scanning: "bg-gray-50",
    success: "bg-green-500",
    already_scanned: "bg-yellow-400",
    not_found: "bg-red-500",
    error: "bg-red-500",
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${statusColors[status]}`}>
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
          <div id="qr-reader" className="w-full max-w-xs rounded-xl overflow-hidden" />

          {status === "idle" && (
            <button
              onClick={startScanner}
              className="w-full max-w-xs rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Start Scanner
            </button>
          )}

          <div className="flex items-center gap-2 mt-2">
            <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-400"}`} />
            <span className="text-xs text-gray-500">
              {isOnline ? "Online" : "Offline"}{offlineEnabled ? " · Offline mode enabled" : ""}
            </span>
          </div>

          {!offlineEnabled && (
            <button
              onClick={enableOfflineMode}
              disabled={isLoading || !isOnline}
              className="text-xs text-indigo-600 hover:underline disabled:opacity-40"
            >
              {isLoading ? "Downloading guest list…" : "Enable Offline Mode"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
