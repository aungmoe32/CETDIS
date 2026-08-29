"use client";

import { useState } from "react";
import { allocateTagsAction } from "./actions";

interface Props {
  organizerId: string;
  organizerName: string;
}

export default function AllocationModal({ organizerId, organizerName }: Props) {
  const [open, setOpen] = useState(false);
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
        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 active:scale-95 transition"
      >
        + Allocate Tags
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-gray-200 p-5 shadow-xl space-y-4">
            <div>
              <h4 className="text-sm font-bold text-gray-900">
                Allocate Blank Tags
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Sending a roll to{" "}
                <span className="text-indigo-600 font-medium">
                  {organizerName}
                </span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Number of Blank Tags
                </label>
                <input
                  name="amount"
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 50"
                  className="w-full rounded-xl bg-white border border-gray-300 text-gray-900 placeholder-gray-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <input
                  name="notes"
                  type="text"
                  placeholder="e.g. Mailed Starter Kit, Handed at event..."
                  className="w-full rounded-xl bg-white border border-gray-300 text-gray-900 placeholder-gray-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                  className="flex-1 rounded-xl border border-gray-300 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-xl bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {isPending ? "Saving..." : "Confirm Allocation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
