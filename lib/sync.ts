import { getPendingSyncs, markSyncCompleted } from "./idb";

/**
 * Reads all pending entries from the sync queue and POSTs them to
 * the bulk sync API endpoint. Removes completed entries from the queue.
 */
export async function flushSyncQueue(): Promise<void> {
  const pending = await getPendingSyncs();
  if (pending.length === 0) return;

  try {
    const res = await fetch("/api/checkin/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pending),
    });

    if (!res.ok) {
      console.error("[sync] Server returned", res.status);
      return;
    }

    const { results } = await res.json() as {
      results: { ticket_id: string; success: boolean }[];
    };

    for (const result of results) {
      if (result.success) {
        await markSyncCompleted(result.ticket_id);
      }
    }
  } catch (err) {
    // Network still unavailable — will retry on next online event
    console.warn("[sync] Flush failed, will retry:", err);
  }
}
