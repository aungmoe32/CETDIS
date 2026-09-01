import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportEventGuestListCsvAction } from "@/app/(organizer)/dashboard/actions";
import { updateEventAction } from "@/app/(organizer)/events/[id]/edit/actions";
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

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/utils/db", () => {
  const selectMock = vi.fn();
  const updateMock = vi.fn();
  const insertMock = vi.fn();
  return {
    db: {
      select: selectMock,
      update: updateMock,
      insert: insertMock,
    },
  };
});

describe("Today's Events & Operations (Section 3)", () => {
  const validEventId = "11111111-2222-3333-4444-555555555555";

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

  describe("exportEventGuestListCsvAction", () => {
    it("exports guest list as sanitized CSV", async () => {
      // 1. Event query
      const mockEventQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: validEventId,
          organizerId: "org-1",
          title: "AI Workshop 2026",
        }]),
      };

      // 2. Guest list join query
      const mockGuestListQuery = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([
          {
            fullName: "John Doe",
            email: "john@campus.edu",
            isCheckedIn: true,
            scannedAt: new Date("2026-09-01T10:30:00Z"),
            purchaseMethod: "cash_at_door",
            purchasedNfc: true,
            nfcIssued: true,
          },
          {
            fullName: "Jane Smith",
            email: "jane@campus.edu",
            isCheckedIn: false,
            scannedAt: null,
            purchaseMethod: "online",
            purchasedNfc: false,
            nfcIssued: false,
          },
        ]),
      };

      vi.mocked(db.select)
        .mockReturnValueOnce(mockEventQuery as any)
        .mockReturnValueOnce(mockGuestListQuery as any);

      const res = await exportEventGuestListCsvAction(validEventId);

      expect(res.success).toBe(true);
      expect(res.filename).toContain("guestlist-ai-workshop-2026");
      expect(res.csv).toContain('"Full Name","Email","Check-In Status","Scanned At","Purchase Method","NFC Pass Status"');
      expect(res.csv).toContain('"John Doe","john@campus.edu","Checked In","2026-09-01T10:30:00.000Z","Cash at Door","NFC Active"');
      expect(res.csv).toContain('"Jane Smith","jane@campus.edu","Registered","N/A","Online","QR Only"');
    });

    it("prevents exporting events owned by another organizer", async () => {
      const mockEventQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: validEventId,
          organizerId: "other-org-99",
          title: "Secret Event",
        }]),
      };

      vi.mocked(db.select).mockReturnValueOnce(mockEventQuery as any);

      const res = await exportEventGuestListCsvAction(validEventId);
      expect(res.error).toBe("Forbidden: You do not own this event");
    });
  });

  describe("updateEventAction", () => {
    it("updates event details with valid form data", async () => {
      const mockEventQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: validEventId,
          organizerId: "org-1",
        }]),
      };

      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({}),
      };

      vi.mocked(db.select).mockReturnValueOnce(mockEventQuery as any);
      vi.mocked(db.update).mockReturnValueOnce(mockUpdate as any);

      const formData = new FormData();
      formData.set("title", "Updated AI Symposium");
      formData.set("date_time", "2026-09-10T14:00");
      formData.set("location", "Grand Auditorium");
      formData.set("max_capacity", "250");
      formData.set("price", "7500");

      await updateEventAction(validEventId, formData);

      expect(mockUpdate.set).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Updated AI Symposium",
          location: "Grand Auditorium",
          maxCapacity: 250,
          price: 7500,
        }),
      );
    });

    it("returns error for invalid capacity", async () => {
      const formData = new FormData();
      formData.set("title", "Updated Event");
      formData.set("date_time", "2026-09-10T14:00");
      formData.set("max_capacity", "-5");

      const res = await updateEventAction(validEventId, formData);
      expect(res).toEqual({ error: "Invalid capacity" });
    });
  });
});
