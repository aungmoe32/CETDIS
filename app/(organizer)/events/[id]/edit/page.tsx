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
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mb-1.5"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Edit Event Details</h1>
        </div>
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
