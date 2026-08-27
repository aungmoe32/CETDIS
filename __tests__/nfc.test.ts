import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyProfileForNfc, markNfcIssuedAction } from "@/app/(organizer)/admin/actions";
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

describe("NFC Universal ID Tag Workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "organizer-user-123", email: "admin@campus.edu" } },
        }),
      },
    } as any);
  });

  describe("verifyProfileForNfc", () => {
    it("rejects non-UUID tokens immediately", async () => {
      const result = await verifyProfileForNfc("invalid-token-format");
      expect(result).toEqual({ error: "Invalid token format" });
    });

    it("returns error if student profile is not found", async () => {
      const validUuid = "11111111-2222-3333-4444-555555555555";

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const result = await verifyProfileForNfc(validUuid);
      expect(result).toEqual({ error: "Student profile not found" });
    });

    it("returns profile with purchasedNfc and nfcIssued status when found", async () => {
      const validUuid = "11111111-2222-3333-4444-555555555555";
      const mockProfile = {
        id: "student-123",
        fullName: "Jane Doe",
        email: "jane@student.edu",
        purchasedNfc: true,
        nfcIssued: false,
        checkInToken: validUuid,
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockProfile]),
          }),
        }),
      } as any);

      const result = await verifyProfileForNfc(validUuid);
      expect(result.success).toBe(true);
      expect(result.profile).toEqual(mockProfile);
    });
  });

  describe("markNfcIssuedAction", () => {
    it("rejects non-UUID token", async () => {
      const result = await markNfcIssuedAction("not-a-uuid");
      expect(result).toEqual({ error: "Invalid token format" });
    });

    it("updates profile with nfcIssued: true and logs to nfc_issuances on valid UUID", async () => {
      const validUuid = "11111111-2222-3333-4444-555555555555";
      const mockProfile = {
        id: "student-123",
        purchasedNfc: true,
        nfcIssued: false,
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockProfile]),
          }),
        }),
      } as any);

      const setMock = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{}]),
      });
      vi.mocked(db.update).mockReturnValue({
        set: setMock,
      } as any);

      const valuesMock = vi.fn().mockResolvedValue([{}]);
      vi.mocked(db.insert).mockReturnValue({
        values: valuesMock,
      } as any);

      const result = await markNfcIssuedAction(validUuid, "event-789");
      expect(result).toEqual({ success: true });
      expect(db.transaction).toHaveBeenCalled();
      expect(valuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "student-123",
          issuedBy: "organizer-user-123",
          eventId: "event-789",
        }),
      );
    });

    it("rejects duplicate issuance if tag was already issued", async () => {
      const validUuid = "11111111-2222-3333-4444-555555555555";
      const mockProfile = {
        id: "student-123",
        purchasedNfc: true,
        nfcIssued: true, // already issued
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockProfile]),
          }),
        }),
      } as any);

      const result = await markNfcIssuedAction(validUuid);
      expect(result).toEqual({ error: "NFC tag already issued" });
    });
  });

  describe("Student NFC lifecycle actions", () => {
    it("purchaseNfcAction sets purchasedNfc to true and nfcIssued to false", async () => {
      const { purchaseNfcAction } = await import("@/app/(student)/my-id/actions");
      const setMock = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{}]),
      });

      vi.mocked(db.update).mockReturnValue({
        set: setMock,
      } as any);

      const result = await purchaseNfcAction();
      expect(result).toEqual({ success: true });
      expect(setMock).toHaveBeenCalledWith({
        purchasedNfc: true,
        nfcIssued: false,
      });
    });

    it("reportLostTagAction regenerates checkInToken and resets both purchasedNfc and nfcIssued to false", async () => {
      const { reportLostTagAction } = await import("@/app/(student)/my-id/actions");
      const setMock = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{}]),
      });

      vi.mocked(db.update).mockReturnValue({
        set: setMock,
      } as any);

      const result = await reportLostTagAction();
      expect(result).toEqual({ success: true });
      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({
          purchasedNfc: false,
          nfcIssued: false,
          checkInToken: expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
          ),
        }),
      );
    });
  });
});
