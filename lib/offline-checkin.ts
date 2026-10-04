import type { CachedTicket } from "./idb";
import {
  getTicketByToken,
  getProfileByToken,
  getEventMeta,
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
  | { status: "already_scanned" }
  | {
      status: "no_ticket";
      profileId: string;
      fullName: string;
      eventPrice: number;
      eventTitle: string;
      token: string;
      purchasedNfc?: boolean;
      nfcIssued?: boolean;
    };

/**
 * Pure offline check-in logic.
 * Checks the local IndexedDB ticket roster first.
 * If no ticket exists for this event, checks cached student profiles for walk-up recognition.
 */
export async function offlineCheckIn(
  token: string,
  eventId?: string,
): Promise<CheckInResult> {
  const ticket: CachedTicket | undefined = await getTicketByToken(token);

  // If ticket exists and matches the event (or eventId is omitted)
  if (ticket && (!eventId || ticket.event_id === eventId)) {
    if (ticket.is_checked_in) {
      return { status: "already_scanned" };
    }

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

  // If not on the guest list, check if the student is recognized in campus directory
  const profile = await getProfileByToken(token);
  if (profile) {
    const eventMeta = eventId ? await getEventMeta(eventId) : undefined;
    return {
      status: "no_ticket",
      profileId: profile.profile_id,
      fullName: profile.full_name,
      eventPrice: eventMeta?.price ?? 0,
      eventTitle: eventMeta?.title ?? "Campus Event",
      token,
      purchasedNfc: profile.purchased_nfc,
      nfcIssued: profile.nfc_issued,
    };
  }

  return { status: "not_found" };
}
