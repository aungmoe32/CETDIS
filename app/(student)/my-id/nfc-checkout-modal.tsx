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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-gray-100 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Universal NFC ID Tag Order
            </h2>
            <p className="text-xs text-gray-500">Physical Campus Wristband / Card</p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-full p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {isSuccess ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-3xl font-bold animate-bounce">
              ✓
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Order Confirmed!
            </h3>
            <p className="text-sm text-gray-500">
              Your universal NFC tag is reserved. Show your QR code at the next event to claim your physical tag.
            </p>
          </div>
        ) : (
          <form onSubmit={handleCheckout} className="space-y-4">
            {/* Order summary box */}
            <div className="rounded-xl bg-gray-50 p-3.5 border border-gray-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 block">Item</span>
                <span className="text-sm font-semibold text-gray-900">
                  Universal Campus NFC Tag
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500 block">Total</span>
                <span className="text-base font-bold text-gray-900">
                  {formattedPrice}
                </span>
              </div>
            </div>

            {/* Payment Methods */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Select Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setMethod("kpay")}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between h-20 ${
                    method === "kpay"
                      ? MERCHANTS.kpay.activeBg
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <span className="font-bold text-sm text-blue-700">KBZPay</span>
                  <span className="text-[11px] text-gray-500">KPay Wallet</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod("wave")}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between h-20 ${
                    method === "wave"
                      ? MERCHANTS.wave.activeBg
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <span className="font-bold text-sm text-amber-600">WavePay</span>
                  <span className="text-[11px] text-gray-500">Wave Money</span>
                </button>
              </div>
            </div>

            {/* Dynamic Merchant Details for Selected Method */}
            <div className="rounded-xl border border-gray-200 p-3.5 bg-gray-50/70 space-y-2.5">
              <div className="flex items-center justify-between text-xs pb-1.5 border-b border-gray-200/70">
                <span className="text-gray-500">Account Name:</span>
                <span className="font-medium text-gray-900">
                  {selectedMerchant.name}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pb-1.5 border-b border-gray-200/70">
                <span className="text-gray-500">Merchant Phone:</span>
                <span className="font-mono font-bold text-gray-900 text-sm">
                  {selectedMerchant.phone}
                </span>
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">
                  Demo Transaction ID (Pre-filled):
                </label>
                <input
                  type="text"
                  value={txnId}
                  onChange={(e) => setTxnId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Notice */}
            <p className="text-[11px] text-gray-400 text-center">
              This is a demonstration environment. No actual funds are charged.
            </p>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {isProcessing ? (
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
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Complete Purchase</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
