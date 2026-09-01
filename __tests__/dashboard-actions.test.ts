import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchStudentsForDashboardAction,
  manualCheckInAction,
  manualIssueNfcAction,
} from "@/app/(organizer)/dashboard/actions";
import { db } from "@/utils/db";
import { createClient } from "@/utils/supabase/server";

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({}),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/utils/db", () => {
  const selectMock = vi.fn();
  const updateMock = vi.fn();
  const insertMock = vi.fn();
  const transactionMock = vi.fn(async (cb: any) => {
    return await cb({
      update: updateMock,
      insert: insertMock,
      select: selectMock,
    });
  });
  return {
    db: {
      select: selectMock,
      update: updateMock,
      insert: insertMock,
      transaction: transactionMock,
    },
  };
});

describe("Dashboard Action Center Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "org-1", email: "organizer@campus.edu" } },
        }),
      },
    } as any);
  });

  describe("searchStudentsForDashboardAction", () => {
    it("returns empty array for queries with length < 2", async () => {
      const res = await searchStudentsForDashboardAction("a");
      expect(res).toEqual({ data: [] });
    });
  });

  describe("manualCheckInAction", () => {
    it("rejects non-existent ticket", async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any);

      const res = await manualCheckInAction("t-unknown");
      expect(res).toEqual({ error: "Ticket not found" });
    });

    it("rejects checking in if already checked in", async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                { ticketId: "t-1", isCheckedIn: true, organizerId: "org-1" },
              ]),
            }),
          }),
        }),
      } as any);

      const res = await manualCheckInAction("t-1");
      expect(res).toEqual({ error: "Attendee is already checked in" });
    });

    it("successfully checks in a valid registered ticket", async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                { ticketId: "t-1", isCheckedIn: false, organizerId: "org-1" },
              ]),
            }),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(true),
        }),
      } as any);

      const res = await manualCheckInAction("t-1");
      expect(res).toEqual({ success: true });
    });
  });

  describe("manualIssueNfcAction", () => {
    it("rejects non-UUID token", async () => {
      const res = await manualIssueNfcAction("invalid-token");
      expect(res).toEqual({ error: "Invalid token format" });
    });

    it("rejects if student profile does not exist", async () => {
      const token = "11111111-2222-3333-4444-555555555555";
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const res = await manualIssueNfcAction(token);
      expect(res).toEqual({ error: "Student profile not found" });
    });
  });
});
