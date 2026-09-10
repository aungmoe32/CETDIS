"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createEventAction } from "./actions";
import RichTextEditor from "@/components/rich-text-editor";
import WobbleButton from "@/components/ui/wobble-button";

interface State {
  error?: string;
}

const initialState: State = {};

const CAPACITY_PRESETS = [50, 100, 200, 500, 1000];
const PRICE_PRESETS = [
  { label: "Free (0 MMK)", value: 0 },
  { label: "1,000 MMK", value: 1000 },
  { label: "3,000 MMK", value: 3000 },
  { label: "5,000 MMK", value: 5000 },
  { label: "10,000 MMK", value: 10000 },
];

export default function CreateEventPage() {
  const [capacity, setCapacity] = useState<number | "">(100);
  const [price, setPrice] = useState<number | "">(0);

  const [state, formAction, pending] = useActionState(
    async (prev: State, formData: FormData): Promise<State> => {
      const result = await createEventAction(formData);
      return result ?? prev;
    },
    initialState,
  );

  return (
    <div className="px-3.5 sm:px-4 py-4 sm:py-6 max-w-2xl mx-auto space-y-5 sm:space-y-6 pb-6">
      {/* Top Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
        <Link
          href="/events/all"
          className="hover:text-indigo-600 transition flex items-center gap-1 font-dingos-bold"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          <span>All Events</span>
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-dingos-bold">New Event</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 font-dingos-bold">
          Create New Event
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Publish a campus gathering, define venue logistics, capacity limits,
          and pricing.
        </p>
      </div>

      {/* Form Container Card */}
      <form
        action={formAction}
        className="rounded-3xl border border-gray-200/90 bg-white p-4 sm:p-8 shadow-xs space-y-5 sm:space-y-6"
      >
        {/* Error Notification */}
        {state.error && (
          <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-xs font-medium text-red-800 flex items-start gap-2.5">
            <svg
              className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <circle cx="12" cy="12" r="9" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4m0 4h.01"
              />
            </svg>
            <div>
              <p className="font-bold font-dingos-bold">
                Unable to create event
              </p>
              <p className="text-red-700 mt-0.5">{state.error}</p>
            </div>
          </div>
        )}

        {/* 1. Title */}
        <div className="space-y-1.5">
          <label
            htmlFor="title"
            className="block text-xs font-bold uppercase tracking-wider text-gray-700 font-dingos-bold"
          >
            Event Title <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="e.g. Annual Tech Symposium & Hackathon 2026"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-150 transition"
            />
          </div>
        </div>

        {/* 2. Rich Text Description */}
        <RichTextEditor
          name="description"
          label="Event Overview & Agenda"
          placeholder="Outline event highlights, schedule, speakers, requirements, dress code, or special instructions..."
        />

        {/* 3. Schedule & Location Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Date & Time */}
          <div className="space-y-1.5">
            <label
              htmlFor="date_time"
              className="block text-xs font-bold uppercase tracking-wider text-gray-700 font-dingos-bold"
            >
              Date &amp; Time <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="date_time"
                name="date_time"
                type="datetime-local"
                required
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-150 transition"
              />
            </div>
            <p className="text-[11px] text-gray-400">
              Timezone is local campus time
            </p>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label
              htmlFor="location"
              className="block text-xs font-bold uppercase tracking-wider text-gray-700 font-dingos-bold"
            >
              Venue / Location
            </label>
            <div className="relative">
              <input
                id="location"
                name="location"
                type="text"
                placeholder="e.g. Main Auditorium, Block C"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-150 transition"
              />
            </div>
            <p className="text-[11px] text-gray-400">
              Leave blank if online or TBD
            </p>
          </div>
        </div>

        {/* 4. Capacity & Pricing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-gray-100">
          {/* Max Capacity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="max_capacity"
                className="block text-xs font-bold uppercase tracking-wider text-gray-700 font-dingos-bold"
              >
                Max Capacity <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-gray-400 font-medium">
                Headcount limit
              </span>
            </div>

            <input
              id="max_capacity"
              name="max_capacity"
              type="number"
              required
              min={1}
              value={capacity}
              onChange={(e) =>
                setCapacity(
                  e.target.value === "" ? "" : parseInt(e.target.value, 10),
                )
              }
              placeholder="e.g. 200"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 font-medium focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-150 transition"
            />

            {/* Quick Presets for Capacity */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] text-gray-400 font-semibold uppercase">
                Presets:
              </span>
              {CAPACITY_PRESETS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setCapacity(val)}
                  className={`text-[11px] px-2.5 py-0.5 rounded-full transition font-dingos-bold ${
                    capacity === val
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Ticket Price */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="price"
                className="block text-xs font-bold uppercase tracking-wider text-gray-700 font-dingos-bold"
              >
                Ticket Price (MMK)
              </label>
              <span className="text-[11px] text-gray-400 font-medium">
                0 = Free event
              </span>
            </div>

            <div className="relative">
              <input
                id="price"
                name="price"
                type="number"
                min={0}
                step={500}
                value={price}
                onChange={(e) =>
                  setPrice(
                    e.target.value === "" ? "" : parseInt(e.target.value, 10),
                  )
                }
                placeholder="0"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 font-medium focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-150 transition"
              />
              <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-xs font-semibold text-gray-400 pointer-events-none">
                MMK
              </span>
            </div>

            {/* Quick Presets for Price */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] text-gray-400 font-semibold uppercase">
                Presets:
              </span>
              {PRICE_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPrice(p.value)}
                  className={`text-[11px] px-2.5 py-0.5 rounded-full transition font-dingos-bold ${
                    price === p.value
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {p.value === 0
                    ? "Free"
                    : `${(p.value / 1000).toLocaleString()}k`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="pt-4 border-t border-gray-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Link
            href="/events/all"
            className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 sm:py-2.5 rounded-full border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 active:scale-95 transition font-dingos-bold text-center"
          >
            Discard &amp; Return
          </Link>

          <WobbleButton
            type="submit"
            disabled={pending}
            text={pending ? "Publishing Event..." : "Publish Event"}
            hoverText={pending ? "Publishing..." : "Launch Event"}
            fillColor="#4f46e5"
            hoverColor="#4338ca"
            fontFamily="font-dingos-bold"
            className="w-full sm:w-auto px-7 py-3 text-xs sm:text-sm text-white shadow-xs"
            icon={
              pending ? (
                <svg
                  className="w-4 h-4 animate-spin text-white"
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
              ) : (
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                  />
                </svg>
              )
            }
          />
        </div>
      </form>
    </div>
  );
}
