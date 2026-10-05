import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/utils/db";
import { events } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import Scanner from "./scanner";

interface Props {
  searchParams: Promise<{ event?: string }>;
}

export const metadata = { title: "Door Scanner" };

export default async function ScanPage({ searchParams }: Props) {
  const { event: eventId } = await searchParams;

  if (!eventId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-gray-200/90 bg-white p-7 text-center shadow-xs space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 7V5a2 2 0 012-2h2m10 0h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"
              />
            </svg>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-gray-900 font-dingos-bold">
              No Event Selected
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">
              Please choose an active event from your schedule to launch the
              door scanner.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <Link
              href="/events/all"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 active:scale-95 transition shadow-xs font-dingos-bold"
            >
              Browse All Events
            </Link>
            <Link
              href="/dashboard"
              className="flex-1 inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 active:scale-95 transition font-dingos-bold"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const [event] = await db
    .select({
      id: events.id,
      title: events.title,
      location: events.location,
    })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) notFound();

  return (
    <div className="flex flex-col min-h-[calc(100dvh-10rem)] sm:h-[calc(100dvh-4rem)] md:h-full overflow-hidden bg-gray-50/30">
      {/* Top Scanner Navigation Bar */}
      <div className="px-4 py-2.5 sm:py-3 border-b border-gray-200/90 bg-white shrink-0 flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/events/all"
            title="Back to All Events"
            className="flex-shrink-0 w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 active:scale-90 transition"
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
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 font-dingos-bold">
                Door Check-In
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span className="text-[10px] text-gray-400 font-medium truncate max-w-[120px] sm:max-w-none">
                {event.location || "Campus Venue"}
              </span>
            </div>
            <p className="font-bold text-gray-900 text-sm sm:text-base truncate font-dingos-bold">
              {event.title}
            </p>
          </div>
        </div>

        {/* Live Status indicator */}
        {/* <div className="flex-shrink-0 flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-dingos-bold shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Gate Open</span>
          </div>
        </div> */}
      </div>

      {/* Main Interactive Scanner Component */}
      <Scanner eventId={event.id} />
    </div>
  );
}
