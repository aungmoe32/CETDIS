"use client";

import { useState } from "react";
import NfcCheckoutModal from "./nfc-checkout-modal";

interface Props {
  purchasedNfc: boolean;
  nfcIssued: boolean;
}

export default function NfcSection({ purchasedNfc, nfcIssued }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="w-full max-w-xs bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <svg
              className="h-4 w-4"
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
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Physical NFC ID Tag</h3>
            <p className="text-[11px] text-gray-400">Universal Campus Pass</p>
          </div>
        </div>

        {/* State 1: Active Tag Issued */}
        {purchasedNfc && nfcIssued && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200/60">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-800">
                Active &amp; Linked
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Your physical NFC tag is linked to your digital identity. Tap it at any campus event door for instant check-in.
            </p>
          </div>
        )}

        {/* State 2: Purchased, awaiting pickup & issue */}
        {purchasedNfc && !nfcIssued && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200/60">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-xs font-semibold text-amber-800">
                Awaiting Pickup
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Show your QR code above to any event organizer or at the door to claim and link your physical tag.
            </p>
          </div>
        )}

        {/* State 3: Not yet purchased */}
        {!purchasedNfc && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 leading-relaxed">
              Get a reusable NFC wristband or card. Tap into events even if your phone battery dies.
            </p>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold text-gray-900">3,000 MMK</span>
              <button
                onClick={() => setIsModalOpen(true)}
                className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-95 transition"
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
    </>
  );
}
