import { getPendingSyncs, markSyncCompleted } from "./idb";

// Module-level lock — prevents concurrent flush calls (e.g. mount flush
// overlapping with the online event handler or a manual sync button tap).
let isFlushing = false;

/**
 * Reads all pending entries from the sync queue and POSTs them to
 * the bulk sync API endpoint. Removes completed entries from the queue.
 * Safe to call multiple times concurrently — extra calls are no-ops.
 */
export async function flushSyncQueue(): Promise<void> {
  if (isFlushing) return;
  isFlushing = true;

  try {
    const pending = await getPendingSyncs();
    if (pending.length === 0) return;

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
  } finally {
    isFlushing = false;
  }
}
