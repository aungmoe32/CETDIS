import { openDB, type IDBPDatabase } from "idb";

export interface CachedTicket {
  ticket_id: string;
  event_id: string;  // stored so we can scope presence checks to the current event
  check_in_token: string;
  full_name: string;
  is_checked_in: boolean;
  purchased_nfc?: boolean;
  nfc_issued?: boolean;
}

export interface SyncQueueEntry {
  ticket_id: string;
  type?: "checkin" | "issue_nfc";
  token?: string;
  scanned_at: string; // ISO timestamp
  sync_status: "pending" | "completed";
}

const DB_NAME = "cetdis-offline";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("cached_tickets")) {
          const store = db.createObjectStore("cached_tickets", {
            keyPath: "ticket_id",
          });
          store.createIndex("by_token", "check_in_token", { unique: true });
        }
        if (!db.objectStoreNames.contains("sync_queue")) {
          db.createObjectStore("sync_queue", { keyPath: "ticket_id" });
        }
      },
    });
  }
  return dbPromise;
}

// ─── Cached Tickets ───────────────────────────────────────────────────────────

export async function saveGuestList(tickets: CachedTicket[]) {
  const db = await getDb();

  // Read pending syncs BEFORE clearing, so we don't lose locally-tracked
  // check-ins that haven't reached the server yet.
  const pending = await getPendingSyncs();
  const pendingIds = new Set(pending.map((p) => p.ticket_id));

  const tx = db.transaction("cached_tickets", "readwrite");
  await tx.objectStore("cached_tickets").clear();
  for (const ticket of tickets) {
    // If this ticket is in the pending queue, the server doesn't know it was
    // scanned yet — override the stale server value with true.
    if (pendingIds.has(ticket.ticket_id)) {
      ticket.is_checked_in = true;
    }
    await tx.objectStore("cached_tickets").put(ticket);
  }
  await tx.done;
}


export async function getTicketByToken(
  token: string,
): Promise<CachedTicket | undefined> {
  const db = await getDb();
  const index = db
    .transaction("cached_tickets", "readonly")
    .objectStore("cached_tickets")
    .index("by_token");
  return index.get(token);
}

export async function markCheckedInLocally(ticketId: string) {
  const db = await getDb();
  const tx = db.transaction("cached_tickets", "readwrite");
  const store = tx.objectStore("cached_tickets");
  const ticket = await store.get(ticketId);
  if (ticket) {
    ticket.is_checked_in = true;
    await store.put(ticket);
  }
  await tx.done;
}

export async function markNfcIssuedLocally(token: string) {
  const db = await getDb();
  const tx = db.transaction("cached_tickets", "readwrite");
  const store = tx.objectStore("cached_tickets");
  const index = store.index("by_token");
  const ticket = await index.get(token);
  if (ticket) {
    ticket.purchased_nfc = true;
    ticket.nfc_issued = true;
    await store.put(ticket);
  }
  await tx.done;
}

// Upserts a single ticket into the local cache (insert or overwrite).
// Used to grow the offline DB dynamically as tickets are scanned online,
// without needing to download the full guest list first.
export async function upsertTicket(ticket: CachedTicket): Promise<void> {
  const db = await getDb();
  await db.put("cached_tickets", ticket);
}


// ─── Sync Queue ───────────────────────────────────────────────────────────────

export async function addToSyncQueue(entry: SyncQueueEntry) {
  const db = await getDb();
  await db.put("sync_queue", entry);
}

export async function getPendingSyncs(): Promise<SyncQueueEntry[]> {
  const db = await getDb();
  const all: SyncQueueEntry[] = await db.getAll("sync_queue");
  return all.filter((e) => e.sync_status === "pending");
}

export async function markSyncCompleted(ticketId: string) {
  const db = await getDb();
  await db.delete("sync_queue", ticketId);
}

export async function clearSyncQueue() {
  const db = await getDb();
  await db.clear("sync_queue");
}

// ─── Cached Ticket Presence ───────────────────────────────────────────────────

// Returns true if there is at least one cached ticket for the given event.
// Scoped to eventId so we don't incorrectly restore offline mode when the
// organizer switches to a different event whose list hasn't been downloaded.
export async function hasCachedTickets(eventId: string): Promise<boolean> {
  const db = await getDb();
  const all = await db.getAll("cached_tickets");
  return all.some((t) => t.event_id === eventId);
}
