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
    activeBg: "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20",
  },
  wave: {
    name: "Daw Hnin Ei (CETDIS Wave)",
    phone: "09-971234567",
    label: "WavePay",
    subLabel: "Wave Money",
    color: "text-amber-600",
    activeBg: "border-amber-600 bg-amber-50/60 ring-2 ring-amber-500/20",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-gray-100 relative overflow-hidden space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-3.5">
          <div>
            {/* <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full font-dingos-bold inline-block mb-1">
              Physical Tag Order
            </span> */}
            <h2 className="text-lg font-bold text-gray-900 font-dingos-bold">
              Universal NFC ID Tag
            </h2>
            <p className="text-xs text-gray-500 truncate max-w-xs mt-0.5">
              Physical Campus Wristband / Card
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-full p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer disabled:cursor-not-allowed"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {isSuccess ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-bold shadow-xs animate-bounce">
              ✓
            </div>
            <h3 className="text-lg font-bold text-gray-900 font-dingos-bold">
              Payment Successful!
            </h3>
            <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
              Your NFC pass is ready. Show your digital QR code to any organizer
              to claim your physical tag.
            </p>
          </div>
        ) : (
          <form onSubmit={handleCheckout} className="space-y-4">
            {/* Order Summary Box */}
            <div className="rounded-2xl bg-gray-50 border border-gray-200/80 p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-dingos-bold block">
                  Tag Price
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl font-bold text-gray-900 font-bebas">
                    {price.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-gray-500 font-dingos-bold">
                    MMK
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full font-dingos-bold">
                Physical Pass
              </span>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider font-dingos-bold mb-2">
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
                      className={`p-3 rounded-2xl border text-left transition relative flex flex-col justify-between h-20 active:scale-98 tactile-btn cursor-pointer ${
                        isSelected
                          ? info.activeBg
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div>
                        <p
                          className={`font-bold text-sm font-dingos-bold ${info.color}`}
                        >
                          {info.label}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {info.subLabel}
                        </p>
                      </div>
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

            {/* Dynamic Merchant Details for Selected Method */}
            <div className="rounded-2xl border border-gray-200/80 p-3.5 bg-gray-50/70 space-y-2.5">
              <div className="flex items-center justify-between text-xs pb-1.5 border-b border-gray-200/70">
                <span className="text-gray-400 font-medium">Account Name:</span>
                <span className="font-semibold text-gray-900">
                  {selectedMerchant.name}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pb-1.5 border-b border-gray-200/70">
                <span className="text-gray-400 font-medium">
                  Merchant Phone:
                </span>
                <span className="font-bold text-gray-900 font-mono text-sm">
                  {selectedMerchant.phone}
                </span>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider font-dingos-bold mb-1">
                  Demo Transaction ID (Pre-filled):
                </label>
                <input
                  type="text"
                  value={txnId}
                  onChange={(e) => setTxnId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>
            </div>

            {/* Notice */}
            <p className="text-[10px] text-gray-400 text-center">
              This is a demonstration environment. No actual funds are charged.
            </p>

            {/* Actions */}
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="flex-1 rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-bold font-dingos-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition tactile-btn cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="flex-1 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-bold font-dingos-bold text-white hover:bg-indigo-700 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-xs tactile-btn cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <svg
                      className="animate-spin h-3.5 w-3.5 text-white"
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
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Complete Payment</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
