import { describe, it, expect, vi, beforeEach } from "vitest";
import { offlineCheckIn } from "@/lib/offline-checkin";
import * as idb from "@/lib/idb";

vi.mock("@/lib/idb");

const mockTicket = {
  ticket_id: "ticket-123",
  check_in_token: "token-uuid-abc",
  full_name: "John Doe",
  is_checked_in: false,
};

describe("offlineCheckIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Condition A: returns not_found when token is not in local DB", async () => {
    vi.mocked(idb.getTicketByToken).mockResolvedValue(undefined);

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
});
