"use client";

import { useState } from "react";
import { purchaseNfcAction } from "./actions";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  price?: number;
}

type PaymentMethod = "kpay" | "wave";

interface MerchantDetails {
  name: string;
  phone: string;
  label: string;
  subLabel: string;
  color: string;
  activeBg: string;
}

const MERCHANTS: Record<PaymentMethod, MerchantDetails> = {
  kpay: {
    name: "U Kyaw Swar (CETDIS KPay)",
    phone: "09-250123456",
    label: "KBZPay",
    subLabel: "KPay Wallet",
    color: "text-blue-700",
    activeBg: "border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20",
  },
  wave: {
    name: "Daw Hnin Ei (CETDIS Wave)",
    phone: "09-971234567",
    label: "WavePay",
    subLabel: "Wave Money",
    color: "text-amber-600",
    activeBg: "border-amber-600 bg-amber-50/50 ring-2 ring-amber-500/20",
  },
};

export default function NfcCheckoutModal({
  isOpen,
  onClose,
  price = 3000,
}: Props) {
  const [method, setMethod] = useState<PaymentMethod>("kpay");
  const [txnId, setTxnId] = useState(
    () => `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const formattedPrice = `${price.toLocaleString()} MMK`;
  const selectedMerchant = MERCHANTS[method];

  if (!isOpen) return null;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate payment verification delay
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const result = await purchaseNfcAction();

    setIsProcessing(false);
    if (result.success) {
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1500);
    } else {
      alert(result.error || "Failed to process payment");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-gray-100 relative overflow-hidden space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            {/* <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full font-dingos-bold">
              Instant Order
            </span> */}
            <h2 className="text-xl font-bold text-gray-900 mt-1 font-dingos-bold">
              Universal NFC ID Tag
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Physical Campus Wristband / Card
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-full w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer disabled:cursor-not-allowed"
          >
            ✕
          </button>
        </div>

        {isSuccess ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-2.5 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-bold shadow-2xs">
              ✓
            </div>
            <h4 className="text-lg font-bold text-gray-900 font-dingos-bold">
              Payment Confirmed!
            </h4>
            <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
              Your NFC pass is ready. Show your digital QR code to any organizer
              to claim your physical tag.
            </p>
          </div>
        ) : (
          <form onSubmit={handleCheckout} className="space-y-4">
            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 font-dingos-bold">
                Select Mobile Wallet
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {(["kpay", "wave"] as const).map((m) => {
                  const info = MERCHANTS[m];
                  const isSelected = method === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={`p-3 rounded-2xl border text-left transition relative tactile-btn cursor-pointer ${
                        isSelected
                          ? info.activeBg
                          : "border-gray-200 bg-white hover:bg-gray-50/70"
                      }`}
                    >
                      <p
                        className={`font-bold text-sm font-dingos-bold ${info.color}`}
                      >
                        {info.label}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {info.subLabel}
                      </p>
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Merchant Account Details Box */}
            <div className="rounded-2xl bg-gray-50/80 border border-gray-200/80 p-3.5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium">
                  Recipient Account:
                </span>
                <span className="font-bold text-gray-900 font-dingos-bold">
                  {selectedMerchant.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium">
                  Phone / PayID:
                </span>
                <span className="font-bold text-indigo-700 font-dingos-bold text-sm">
                  {selectedMerchant.phone}
                </span>
              </div>
              {/* <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
                <span className="text-gray-500 font-medium">Simulated Txn ID:</span>
                <span className="font-mono text-gray-600 text-[11px]">
                  {txnId}
                </span>
              </div> */}
            </div>

            {/* Price Breakdown */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider font-dingos-bold">
                Total Due:
              </span>
              <span className="font-dingos-bold text-md text-gray-900 tracking-wide">
                {formattedPrice}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="flex-1 rounded-full border border-gray-200 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition font-dingos-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="flex-1 rounded-full bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition font-dingos-bold tactile-btn flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <svg
                      className="w-3.5 h-3.5 animate-spin text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="12" cy="12" r="9" strokeWidth={2} />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 3v4"
                      />
                    </svg>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Pay</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
