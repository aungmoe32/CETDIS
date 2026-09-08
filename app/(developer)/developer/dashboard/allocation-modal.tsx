"use client";

import { useState } from "react";
import { allocateTagsAction } from "./actions";

interface Props {
  organizerId: string;
  organizerName: string;
}

const ROLL_PRESETS = [25, 50, 100, 250, 500];

export default function AllocationModal({ organizerId, organizerName }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number | "">(50);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("organizerId", organizerId);

    const res = await allocateTagsAction(formData);
    setIsPending(false);

    if (res.error) {
      setError(res.error);
    } else {
      setOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setError(null);
        }}
        className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 active:scale-95 transition shadow-2xs font-dingos-bold tactile-btn"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        <span>Allocate Tags</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-gray-100 p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full font-dingos-bold">
                Tag Allocation
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xs font-bold font-dingos-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <h4 className="text-lg font-bold text-gray-900 font-dingos-bold">
                Allocate Blank NFC Tags
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Dispatching physical tag rolls to{" "}
                <span className="text-indigo-600 font-bold font-dingos-bold">
                  {organizerName}
                </span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 font-dingos-bold">
                    Number of Tags
                  </label>
                  <span className="text-[11px] text-gray-400 font-medium">Headcount</span>
                </div>
                <input
                  name="amount"
                  type="number"
                  min="1"
                  required
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value === "" ? "" : parseInt(e.target.value, 10))
                  }
                  placeholder="e.g. 50"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 font-medium focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-150 transition"
                />

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase">Presets:</span>
                  {ROLL_PRESETS.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val)}
                      className={`text-[11px] px-2.5 py-0.5 rounded-full transition font-dingos-bold ${
                        amount === val
                          ? "bg-indigo-600 text-white shadow-2xs"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 font-dingos-bold">
                  Allocation Notes (optional)
                </label>
                <input
                  name="notes"
                  type="text"
                  placeholder="e.g. Mailed Starter Kit, Handed at door..."
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-150 transition"
                />
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50/80 p-3 text-xs text-red-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <circle cx="12" cy="12" r="9" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
                  </svg>
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                  className="flex-1 rounded-full border border-gray-200 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 active:scale-95 disabled:opacity-50 transition font-dingos-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-full bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition shadow-xs font-dingos-bold tactile-btn flex items-center justify-center gap-1.5"
                >
                  {isPending ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" strokeWidth={2} />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v4" />
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Confirm Allocation</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
