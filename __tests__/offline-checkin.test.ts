import { describe, it, expect, vi, beforeEach } from "vitest";
import { offlineCheckIn } from "@/lib/offline-checkin";
import * as idb from "@/lib/idb";

vi.mock("@/lib/idb");

const mockTicket = {
  ticket_id: "ticket-123",
  event_id: "event-123",
  check_in_token: "token-uuid-abc",
  full_name: "John Doe",
  is_checked_in: false,
};

const mockProfile = {
  profile_id: "profile-456",
  check_in_token: "token-uuid-walkup",
  full_name: "Jane Student",
  purchased_nfc: false,
  nfc_issued: false,
};

describe("offlineCheckIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Condition A: returns not_found when token is neither a ticket nor a registered student profile", async () => {
    vi.mocked(idb.getTicketByToken).mockResolvedValue(undefined);
    vi.mocked(idb.getProfileByToken).mockResolvedValue(undefined);

    const result = await offlineCheckIn("unknown-token");

    expect(result.status).toBe("not_found");
    expect(idb.markCheckedInLocally).not.toHaveBeenCalled();
    expect(idb.addToSyncQueue).not.toHaveBeenCalled();
  });

  it("Condition B: returns already_scanned when ticket is already checked in", async () => {
    vi.mocked(idb.getTicketByToken).mockResolvedValue({
      ...mockTicket,
      is_checked_in: true,
    });

    const result = await offlineCheckIn("token-uuid-abc");

    expect(result.status).toBe("already_scanned");
    expect(idb.markCheckedInLocally).not.toHaveBeenCalled();
  });

  it("Condition C: marks checked in and adds to sync queue on success", async () => {
    vi.mocked(idb.getTicketByToken).mockResolvedValue(mockTicket);
    vi.mocked(idb.markCheckedInLocally).mockResolvedValue(undefined);
    vi.mocked(idb.addToSyncQueue).mockResolvedValue(undefined);

    const result = await offlineCheckIn("token-uuid-abc");

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.fullName).toBe("John Doe");
    }
    expect(idb.markCheckedInLocally).toHaveBeenCalledWith("ticket-123");
    expect(idb.addToSyncQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        ticket_id: "ticket-123",
        sync_status: "pending",
      }),
    );
  });

  it("Condition D: returns no_ticket when student profile exists in campus directory without an event ticket", async () => {
    vi.mocked(idb.getTicketByToken).mockResolvedValue(undefined);
    vi.mocked(idb.getProfileByToken).mockResolvedValue(mockProfile);
    vi.mocked(idb.getEventMeta).mockResolvedValue({
      id: "event-123",
      title: "Campus Hackathon",
      price: 5000,
    });

    const result = await offlineCheckIn("token-uuid-walkup", "event-123");

    expect(result.status).toBe("no_ticket");
    if (result.status === "no_ticket") {
      expect(result.fullName).toBe("Jane Student");
      expect(result.profileId).toBe("profile-456");
      expect(result.eventPrice).toBe(5000);
      expect(result.eventTitle).toBe("Campus Hackathon");
      expect(result.token).toBe("token-uuid-walkup");
    }
    expect(idb.markCheckedInLocally).not.toHaveBeenCalled();
    expect(idb.addToSyncQueue).not.toHaveBeenCalled();
  });
});
