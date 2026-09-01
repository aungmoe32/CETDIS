import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  checkInAction,
  sellWalkUpTicketToStudentAction,
} from "@/app/(organizer)/scan/actions";
import { issueGuestWalkUpAction } from "@/app/(organizer)/dashboard/actions";
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

describe("Walk-Up Sales (At-The-Door Sales)", () => {
  const validToken = "11111111-2222-3333-4444-555555555555";
  const validEventId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  const validProfileId = "99999999-8888-7777-6666-555555555555";

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

  describe("Scenario A: Existing Student (No Ticket at Door)", () => {
    it("returns status: 'no_ticket' when attendee exists but has no ticket for event", async () => {
      // 1. Event query
      const mockEventQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          organizerId: "org-1",
          price: 5000,
          title: "Hackathon Night",
        }]),
      };

      // 2. Profile query
      const mockProfileQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: validProfileId,
          fullName: "John Doe",
          purchasedNfc: false,
          nfcIssued: false,
        }]),
      };

      // 3. Ticket query (returns empty = no ticket)
      const mockTicketQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(db.select)
        .mockReturnValueOnce(mockEventQuery as any)
        .mockReturnValueOnce(mockProfileQuery as any)
        .mockReturnValueOnce(mockTicketQuery as any);

      const res = await checkInAction(validToken, validEventId);

      expect(res).toEqual({
        status: "no_ticket",
        profileId: validProfileId,
        fullName: "John Doe",
        eventPrice: 5000,
        eventTitle: "Hackathon Night",
        token: validToken,
        purchasedNfc: false,
        nfcIssued: false,
      });
    });

    it("sells walk-up ticket to recognized student and marks checked in", async () => {
      // 1. Event query
      const mockEventQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ organizerId: "org-1" }]),
      };

      // 2. Profile query
      const mockProfileQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: validProfileId,
          fullName: "John Doe",
          purchasedNfc: false,
          nfcIssued: false,
        }]),
      };

      // 3. Check existing ticket (none)
      const mockTicketQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      // 4. Insert ticket
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: "ticket-new-1" }]),
      };

      vi.mocked(db.select)
        .mockReturnValueOnce(mockEventQuery as any)
        .mockReturnValueOnce(mockProfileQuery as any)
        .mockReturnValueOnce(mockTicketQuery as any);

      vi.mocked(db.insert).mockReturnValueOnce(mockInsert as any);

      const res = await sellWalkUpTicketToStudentAction({
        profileId: validProfileId,
        eventId: validEventId,
        token: validToken,
      });

      expect(res).toEqual({
        status: "success",
        fullName: "John Doe",
        ticketId: "ticket-new-1",
        token: validToken,
        purchasedNfc: false,
        nfcIssued: false,
        needsNfcHandover: false,
      });
      expect(mockInsert.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: validProfileId,
          eventId: validEventId,
          isCheckedIn: true,
          purchaseMethod: "cash_at_door",
        }),
      );
    });
  });

  describe("Scenario B: Guest Walk-Up Sale & Tag Issuance", () => {
    it("creates ghost profile, checked-in ticket, and nfc issuance in transaction", async () => {
      // Event query
      const mockEventQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          organizerId: "org-1",
          title: "Annual Tech Gala",
          price: 10000,
        }]),
      };

      vi.mocked(db.select).mockReturnValueOnce(mockEventQuery as any);

      const mockTxInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue({}),
      });

      vi.mocked(db.transaction).mockImplementationOnce(async (callback: any) => {
        return await callback({
          insert: mockTxInsert,
        });
      });

      const res = await issueGuestWalkUpAction({
        eventId: validEventId,
        guestName: "Alice Guest",
      });

      expect(res.success).toBe(true);
      expect(res.fullName).toBe("Alice Guest");
      expect(res.eventTitle).toBe("Annual Tech Gala");
      expect(res.eventPrice).toBe(10000);
      expect(res.token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(mockTxInsert).toHaveBeenCalledTimes(3); // 1. Ghost Profile, 2. Ticket, 3. NFC Issuance
    });

    it("defaults to 'Guest Attendee' when name is omitted", async () => {
      const mockEventQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          organizerId: "org-1",
          title: "Open Workshop",
          price: 0,
        }]),
      };

      vi.mocked(db.select).mockReturnValueOnce(mockEventQuery as any);

      const mockTxInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue({}),
      });

      vi.mocked(db.transaction).mockImplementationOnce(async (callback: any) => {
        return await callback({
          insert: mockTxInsert,
        });
      });

      const res = await issueGuestWalkUpAction({
        eventId: validEventId,
      });

      expect(res.success).toBe(true);
      expect(res.fullName).toBe("Guest Attendee");
    });
  });
});
