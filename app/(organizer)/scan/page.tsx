import { notFound } from "next/navigation";
import { db } from "@/utils/db";
import { events } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import Scanner from "./scanner";

interface Props {
  searchParams: Promise<{ event?: string }>;
}

export const metadata = { title: "Scanner" };

export default async function ScanPage({ searchParams }: Props) {
  const { event: eventId } = await searchParams;

  if (!eventId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <p className="text-gray-500 text-sm">No event selected.</p>
        <p className="text-xs text-gray-400 mt-1">
          Open the scanner from your Dashboard.
        </p>
      </div>
    );
  }

  const [event] = await db
    .select({ id: events.id, title: events.title })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) notFound();

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem-4rem)] sm:h-[calc(100dvh-3.5rem)] overflow-hidden">
      <div className="px-4 py-2.5 sm:py-3 border-b border-gray-200 bg-white shrink-0 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium text-gray-500">Scanning for Event</p>
          <p className="font-semibold text-gray-900 text-sm truncate">{event.title}</p>
        </div>
      </div>
      <Scanner eventId={event.id} />
    </div>
  );
}
