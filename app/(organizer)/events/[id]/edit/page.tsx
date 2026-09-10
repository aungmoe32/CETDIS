import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { events } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import EditEventForm from "./edit-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, id), eq(events.organizerId, user.id)))
    .limit(1);

  if (!event) notFound();

  // Format dateTime for datetime-local input (YYYY-MM-DDTHH:MM)
  const d = new Date(event.dateTime);
  const offset = d.getTimezoneOffset() * 60000;
  const localIso = new Date(d.getTime() - offset).toISOString().slice(0, 16);

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
        <span className="text-gray-900 font-dingos-bold truncate max-w-[200px]">
          {event.title}
        </span>
        <span>/</span>
        <span className="text-gray-500 font-medium">Edit</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 font-dingos-bold">
          Edit Event Details
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Modify event parameters, venue location, capacity, or ticketing settings.
        </p>
      </div>

      <EditEventForm
        eventId={event.id}
        initialData={{
          title: event.title,
          description: event.description ?? "",
          dateTime: localIso,
          location: event.location || "",
          maxCapacity: event.maxCapacity,
          price: event.price,
        }}
      />
    </div>
  );
}
