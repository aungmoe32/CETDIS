"use client";

import { useActionState } from "react";
import { updateEventAction } from "./actions";
import RichTextEditor from "@/components/rich-text-editor";

interface Props {
  eventId: string;
  initialData: {
    title: string;
    description: string;
    dateTime: string;
    location: string;
    maxCapacity: number;
    price: number;
  };
}

interface State {
  error?: string;
}

const initialState: State = {};

export default function EditEventForm({ eventId, initialData }: Props) {
  const [state, formAction, pending] = useActionState(
    async (prev: State, formData: FormData): Promise<State> => {
      const result = await updateEventAction(eventId, formData);
      return result ?? prev;
    },
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4 bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
      <div>
        <label htmlFor="title" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
          Event Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={initialData.title}
          placeholder="e.g. Spring IT Hackathon"
          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
        />
      </div>

      {/* Rich Text Event Description */}
      <RichTextEditor
        name="description"
        defaultValue={initialData.description}
        label="Event Description"
        placeholder="Enter event overview, special instructions, schedule details, or speaker line-up..."
      />

      <div>
        <label htmlFor="date_time" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
          Date &amp; Time
        </label>
        <input
          id="date_time"
          name="date_time"
          type="datetime-local"
          required
          defaultValue={initialData.dateTime}
          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
        />
      </div>

      <div>
        <label htmlFor="location" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
          Location
        </label>
        <input
          id="location"
          name="location"
          type="text"
          defaultValue={initialData.location}
          placeholder="e.g. Main Auditorium"
          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="max_capacity" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
            Max Capacity
          </label>
          <input
            id="max_capacity"
            name="max_capacity"
            type="number"
            min={1}
            required
            defaultValue={initialData.maxCapacity}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
          />
        </div>

        <div>
          <label htmlFor="price" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
            Price (MMK)
          </label>
          <input
            id="price"
            name="price"
            type="number"
            min={0}
            defaultValue={initialData.price}
            placeholder="0 = Free"
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
          />
        </div>
      </div>

      {state?.error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {state.error}
        </p>
      )}

      <div className="pt-2 flex gap-3">
        <a
          href="/dashboard"
          className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 text-center hover:bg-gray-50 transition"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition shadow-xs"
        >
          {pending ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
