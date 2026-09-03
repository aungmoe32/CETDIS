"use client";

import { useActionState } from "react";
import { createEventAction } from "./actions";
import RichTextEditor from "@/components/rich-text-editor";

interface State {
  error?: string;
}

const initialState: State = {};

export default function CreateEventPage() {
  const [state, formAction, pending] = useActionState(
    async (prev: State, formData: FormData): Promise<State> => {
      const result = await createEventAction(formData);
      return result ?? prev;
    },
    initialState,
  );

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Create Event</h1>
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Event Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="Spring IT Hackathon"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Rich Text Event Description */}
        <RichTextEditor
          name="description"
          label="Event Description"
          placeholder="Enter event overview, special instructions, schedule details, or speaker line-up..."
        />

        <div>
          <label htmlFor="date_time" className="block text-sm font-medium text-gray-700 mb-1">
            Date &amp; Time
          </label>
          <input
            id="date_time"
            name="date_time"
            type="datetime-local"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <input
            id="location"
            name="location"
            type="text"
            placeholder="Main Hall"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="max_capacity" className="block text-sm font-medium text-gray-700 mb-1">
            Max Capacity
          </label>
          <input
            id="max_capacity"
            name="max_capacity"
            type="number"
            required
            min={1}
            placeholder="200"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
            Ticket Price (MMK)
          </label>
          <input
            id="price"
            name="price"
            type="number"
            min={0}
            step={500}
            defaultValue={0}
            placeholder="0 for Free event, or e.g. 5000"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-gray-400 mt-1">Set to 0 for Free events.</p>
        </div>
        {state.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {pending ? "Creating…" : "Create Event"}
        </button>
      </form>
    </div>
  );
}
