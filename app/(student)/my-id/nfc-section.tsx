"use client";

import { useState } from "react";
import NfcCheckoutModal from "./nfc-checkout-modal";
import { reportLostTagAction } from "./actions";

interface Props {
  purchasedNfc: boolean;
  nfcIssued: boolean;
}

export default function NfcSection({ purchasedNfc, nfcIssued }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const handleReportLost = async () => {
    setIsRevoking(true);
    const res = await reportLostTagAction();
    setIsRevoking(false);
    if (res.success) {
      setIsRevokeModalOpen(false);
    } else {
      alert(res.error || "Failed to report lost tag");
    }
  };

  return (
    <>
      <div className="w-full max-w-sm bg-white border border-gray-200/90 rounded-3xl shadow-xs p-5 sm:p-6 flex flex-col gap-4 select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 shadow-2xs">
              <svg
                className="h-4 w-4"
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
            <div>
              <h3 className="text-sm font-bold text-gray-900 font-dingos-bold">
                Physical NFC ID Tag
              </h3>
              <p className="text-[11px] text-gray-400">Universal Campus Pass</p>
            </div>
          </div>

          {/* <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full font-dingos-bold">
            Hardware
          </span> */}
        </div>

        {/* State 1: Active Tag Issued */}
        {purchasedNfc && nfcIssued && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200/70">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-800 font-dingos-bold">
                Active &amp; Linked to Phone
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Your physical NFC tag is linked to your digital identity. Tap it
              at any campus event door for instant, screen-free check-in.
            </p>
            <button
              onClick={() => setIsRevokeModalOpen(true)}
              className="w-full rounded-full border border-red-200 bg-red-50/50 py-2.5 text-xs font-bold text-red-600 hover:bg-red-100/70 active:scale-95 transition font-dingos-bold"
            >
              Report Lost Tag
            </button>
          </div>
        )}

        {/* State 2: Purchased, awaiting pickup & issue */}
        {purchasedNfc && !nfcIssued && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-amber-50 border border-amber-200/70">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-xs font-bold text-amber-800 font-dingos-bold">
                Awaiting Pickup
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Show your QR code above to any event organizer at the door to
              claim and link your physical tag in seconds.
            </p>
          </div>
        )}

        {/* State 3: Not yet purchased */}
        {!purchasedNfc && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 leading-relaxed">
              Get a reusable physical wristband or card. Tap into campus events
              even if your phone battery is dead.
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-gray-100">
              <div>
                <span className="text-[10px] text-gray-400 block font-medium">
                  One-Time Fee
                </span>
                <span className="font-bebas text-2xl text-gray-900 tracking-wide">
                  3,000 MMK
                </span>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 active:scale-95 transition font-dingos-bold tactile-btn"
              >
                Get NFC Tag
              </button>
            </div>
          </div>
        )}
      </div>

      <NfcCheckoutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        price={3000}
      />

      {/* Confirmation Modal for Reporting Lost Tag */}
      {isRevokeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 sm:p-7 shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-2xs">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-base font-bold text-gray-900 font-dingos-bold">
                  Report Lost Tag?
                </h4>
                <p className="text-xs text-gray-400">
                  Security &amp; Revocation
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              This will <strong>immediately deactivate</strong> your lost
              physical tag and generate a{" "}
              <strong>brand new digital QR code</strong> for your account. You
              can purchase a replacement tag whenever you&apos;re ready.
            </p>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setIsRevokeModalOpen(false)}
                disabled={isRevoking}
                className="flex-1 rounded-full border border-gray-200 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 active:scale-95 disabled:opacity-50 transition font-dingos-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReportLost}
                disabled={isRevoking}
                className="flex-1 rounded-full bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-700 active:scale-95 disabled:opacity-50 transition font-dingos-bold shadow-xs"
              >
                {isRevoking ? "Deactivating..." : "Deactivate Tag"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
