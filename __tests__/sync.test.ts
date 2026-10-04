import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushSyncQueue } from "@/lib/sync";
import * as idb from "@/lib/idb";

vi.mock("@/lib/idb");

const pendingEntries = [
  { ticket_id: "t-1", scanned_at: "2024-01-01T10:00:00Z", sync_status: "pending" as const },
  { ticket_id: "t-2", scanned_at: "2024-01-01T10:01:00Z", sync_status: "pending" as const },
];

describe("flushSyncQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("does nothing when queue is empty", async () => {
    vi.mocked(idb.getPendingSyncs).mockResolvedValue([]);

    await flushSyncQueue();

    expect(fetch).not.toHaveBeenCalled();
  });

  it("POSTs pending entries and marks them completed on success", async () => {
    vi.mocked(idb.getPendingSyncs).mockResolvedValue(pendingEntries);
    vi.mocked(idb.markSyncCompleted).mockResolvedValue(undefined);
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { ticket_id: "t-1", success: true },
          { ticket_id: "t-2", success: true },
        ],
      }),
    } as Response);

    await flushSyncQueue();

    expect(fetch).toHaveBeenCalledWith(
      "/api/checkin/sync",
      expect.objectContaining({ method: "POST" }),
    );
    expect(idb.markSyncCompleted).toHaveBeenCalledWith("t-1");
    expect(idb.markSyncCompleted).toHaveBeenCalledWith("t-2");
  });

  it("does not mark completed if server returns failure for that entry", async () => {
    vi.mocked(idb.getPendingSyncs).mockResolvedValue(pendingEntries);
    vi.mocked(idb.markSyncCompleted).mockResolvedValue(undefined);
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { ticket_id: "t-1", success: true },
          { ticket_id: "t-2", success: false },
        ],
      }),
    } as Response);

    await flushSyncQueue();

    expect(idb.markSyncCompleted).toHaveBeenCalledWith("t-1");
    expect(idb.markSyncCompleted).not.toHaveBeenCalledWith("t-2");
  });

  it("POSTs offline walkup_sale entries and clears them upon success", async () => {
    const walkupEntries = [
      {
        ticket_id: "walkup_abc-123",
        type: "walkup_sale" as const,
        token: "token-uuid-1",
        event_id: "event-1",
        profile_id: "profile-1",
        amount_collected: 5000,
        scanned_at: "2024-01-01T10:02:00Z",
        sync_status: "pending" as const,
      },
    ];

    vi.mocked(idb.getPendingSyncs).mockResolvedValue(walkupEntries);
    vi.mocked(idb.markSyncCompleted).mockResolvedValue(undefined);
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{ ticket_id: "walkup_abc-123", success: true }],
      }),
    } as Response);

    await flushSyncQueue();

    expect(fetch).toHaveBeenCalledWith(
      "/api/checkin/sync",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(walkupEntries),
      }),
    );
    expect(idb.markSyncCompleted).toHaveBeenCalledWith("walkup_abc-123");
  });

  it("handles network failure gracefully without throwing", async () => {
    vi.mocked(idb.getPendingSyncs).mockResolvedValue(pendingEntries);
    vi.mocked(fetch).mockRejectedValue(new Error("Network Error"));

    await expect(flushSyncQueue()).resolves.not.toThrow();
    expect(idb.markSyncCompleted).not.toHaveBeenCalled();
  });
});
