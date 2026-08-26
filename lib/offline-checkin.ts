import type { CachedTicket } from "./idb";
import {
  getTicketByToken,
  markCheckedInLocally,
  addToSyncQueue,
} from "./idb";

export type CheckInResult =
  | {
      status: "success";
      fullName: string;
      ticketId?: string;
      token?: string;
      purchasedNfc?: boolean;
      nfcIssued?: boolean;
      needsNfcHandover?: boolean;
    }
  | { status: "not_found" }
  | { status: "already_scanned" };

/**
 * Pure offline check-in logic.
 * Queries the local IndexedDB guest list, updates state, and writes to sync queue.
 */
export async function offlineCheckIn(token: string): Promise<CheckInResult> {
  const ticket: CachedTicket | undefined = await getTicketByToken(token);

  // Condition A
  if (!ticket) {
    return { status: "not_found" };
  }

  // Condition B
  if (ticket.is_checked_in) {
    return { status: "already_scanned" };
  }

  // Condition C
  const scannedAt = new Date().toISOString();
  await markCheckedInLocally(ticket.ticket_id);
  await addToSyncQueue({
    ticket_id: ticket.ticket_id,
    type: "checkin",
    scanned_at: scannedAt,
    sync_status: "pending",
  });

  const needsNfcHandover = Boolean(ticket.purchased_nfc && !ticket.nfc_issued);

  return {
    status: "success",
    fullName: ticket.full_name,
    ticketId: ticket.ticket_id,
    token,
    purchasedNfc: ticket.purchased_nfc,
    nfcIssued: ticket.nfc_issued,
    needsNfcHandover,
  };
}
