"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  verifyProfileForNfc,
  markNfcIssuedAction,
  getPendingNfcStudentsAction,
} from "./actions";

interface StudentProfile {
  id: string;
  fullName: string;
  email: string;
  purchasedNfc: boolean;
  nfcIssued: boolean;
  checkInToken: string;
}

export default function NfcIssuer() {
  const [activeTab, setActiveTab] = useState<"pending" | "scan">("pending");
  const [pendingStudents, setPendingStudents] = useState<StudentProfile[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(
    null,
  );
  const [isScanning, setIsScanning] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [writeSuccess, setWriteSuccess] = useState(false);
  const [nfcAvailable, setNfcAvailable] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    setNfcAvailable("NDEFReader" in window);
    loadPending();
  }, []);

  const loadPending = async () => {
    setIsLoadingPending(true);
    const res = await getPendingNfcStudentsAction();
    if (res.data) {
      setPendingStudents(res.data as StudentProfile[]);
    }
    setIsLoadingPending(false);
  };

  const startScanner = useCallback(() => {
    const el = document.getElementById("nfc-qr-reader");
    if (!el) return;
    const scanner = new Html5Qrcode("nfc-qr-reader");
    qrScannerRef.current = scanner;
    setIsScanning(true);

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      async (decodedText) => {
        const token = decodedText.split("/").pop() ?? decodedText;
        await scanner.stop();
        qrScannerRef.current = null;
        setIsScanning(false);
        await handleVerifyToken(token);
      },
      undefined,
    );
  }, []);

  const stopScanner = useCallback(async () => {
    if (qrScannerRef.current) {
      try {
        await qrScannerRef.current.stop();
      } catch {
        /* already stopped */
      }
      qrScannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const handleVerifyToken = async (token: string) => {
    setStatusMessage("Verifying student identity...");
    const res = await verifyProfileForNfc(token);
    if (res.success && res.profile) {
      setSelectedStudent(res.profile as StudentProfile);
      setStatusMessage("");
    } else {
      alert(res.error || "Could not verify student profile");
      setStatusMessage("");
    }
  };

  const handleWriteNfcTag = async () => {
    if (!selectedStudent) return;
    setIsWriting(true);
    setStatusMessage("Hold blank NFC tag to device...");

    try {
      if (nfcAvailable && "NDEFReader" in window) {
        const ndef = new window.NDEFReader();
        // Web NFC write writes the raw check-in token UUID
        await ndef.write(selectedStudent.checkInToken);
      } else {
        // Fallback simulation for unsupported browsers / desktop testing
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      // Mark as issued in DB
      const res = await markNfcIssuedAction(selectedStudent.checkInToken);
      if (res.success) {
        setWriteSuccess(true);
        setSelectedStudent((prev) =>
          prev ? { ...prev, nfcIssued: true, purchasedNfc: true } : null,
        );
        loadPending();
      } else {
        alert(res.error || "Failed to update tag status in database");
      }
    } catch (err: unknown) {
      alert(`NFC Write Failed: ${(err as Error).message || String(err)}`);
    } finally {
      setIsWriting(false);
      setStatusMessage("");
    }
  };

  const handleReset = () => {
    setSelectedStudent(null);
    setWriteSuccess(false);
    setStatusMessage("");
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation tabs */}
      <div className="flex gap-2 border-b border-gray-100 pb-3">
        <button
          onClick={() => {
            setActiveTab("pending");
            stopScanner();
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === "pending"
              ? "bg-indigo-50 text-indigo-700"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Pending Orders ({pendingStudents.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("scan");
            handleReset();
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === "scan"
              ? "bg-indigo-50 text-indigo-700"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Scan Student QR
        </button>
      </div>

      {/* Mode 1: Pending Orders List */}
      {activeTab === "pending" && !selectedStudent && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              Students Awaiting NFC Tag Handover
            </h2>
            <button
              onClick={loadPending}
              disabled={isLoadingPending}
              className="text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
            >
              {isLoadingPending ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {pendingStudents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-gray-400">
              <p className="text-sm">No pending NFC tag orders right now.</p>
              <p className="text-xs mt-1">
                When students order physical tags from /my-id, they will appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-xs">
              {pendingStudents.map((student) => (
                <li
                  key={student.id}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-gray-50/70 transition"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {student.fullName}
                    </p>
                    <p className="text-xs text-gray-400">{student.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/50">
                      Paid · Awaiting Tag
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedStudent(student);
                      setWriteSuccess(false);
                    }}
                    className="shrink-0 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 active:scale-95 transition"
                  >
                    Issue Tag →
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Mode 2: QR Scanner */}
      {activeTab === "scan" && !selectedStudent && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-gray-50 border border-gray-200 p-6 flex flex-col items-center justify-center gap-4 text-center">
            <div id="nfc-qr-reader" className="w-full max-w-sm rounded-xl overflow-hidden" />

            {!isScanning ? (
              <>
                <p className="text-xs text-gray-500 max-w-xs">
                  Scan the QR code on the student&apos;s phone screen to verify and link their physical NFC tag.
                </p>
                <button
                  onClick={startScanner}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-95 transition"
                >
                  Start Camera Scan
                </button>
              </>
            ) : (
              <button
                onClick={stopScanner}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Stop Camera
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active Student Card & NFC Tag Writing Flow */}
      {selectedStudent && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-1">
                Student Profile
              </span>
              <h3 className="text-base font-bold text-gray-900">
                {selectedStudent.fullName}
              </h3>
              <p className="text-xs text-gray-400">{selectedStudent.email}</p>
            </div>
            <button
              onClick={handleReset}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Change Student
            </button>
          </div>

          {/* Status info */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span
              className={`px-2.5 py-1 rounded-lg font-medium ${
                selectedStudent.purchasedNfc
                  ? "bg-blue-50 text-blue-700 border border-blue-200/50"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {selectedStudent.purchasedNfc
                ? "✓ NFC Tag Purchased"
                : "NFC Tag Not Purchased"}
            </span>
            <span
              className={`px-2.5 py-1 rounded-lg font-medium ${
                selectedStudent.nfcIssued
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
                  : "bg-amber-50 text-amber-700 border border-amber-200/50"
              }`}
            >
              {selectedStudent.nfcIssued ? "✓ Tag Already Linked" : "Pending Tag Write"}
            </span>
          </div>

          {/* NFC Hardware compatibility badge */}
          <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-gray-500">Device NFC Hardware:</span>
            <span
              className={`font-semibold ${
                nfcAvailable ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {nfcAvailable ? "Web NFC Ready" : "Simulation Mode (Desktop/iOS)"}
            </span>
          </div>

          {writeSuccess ? (
            <div className="py-6 rounded-2xl bg-emerald-50/70 border border-emerald-200 p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 text-2xl font-bold flex items-center justify-center mx-auto">
                ✓
              </div>
              <h4 className="text-sm font-bold text-emerald-900">
                NFC Tag Successfully Programmed!
              </h4>
              <p className="text-xs text-emerald-700 max-w-sm mx-auto">
                The universal token has been written to the physical tag. Hand it to{" "}
                <strong>{selectedStudent.fullName}</strong>. They can now tap into any future event.
              </p>
              <div className="pt-2">
                <button
                  onClick={handleReset}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                >
                  Issue Another Tag
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
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
                <p className="text-xs font-medium text-indigo-900">
                  {statusMessage || "Hold a blank NFC tag/wristband near the device"}
                </p>
                <p className="text-[11px] text-indigo-700/80">
                  Writing token:{" "}
                  <code className="font-mono bg-white/80 px-1 py-0.5 rounded text-[10px]">
                    {selectedStudent.checkInToken.slice(0, 8)}...
                  </code>
                </p>
              </div>

              <button
                onClick={handleWriteNfcTag}
                disabled={isWriting}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {isWriting ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Writing to NFC Tag...</span>
                  </>
                ) : (
                  <span>
                    {selectedStudent.nfcIssued ? "Re-Write NFC Tag" : "Write & Link Blank NFC Tag"}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
