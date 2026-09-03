import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEventAction } from "@/app/(organizer)/events/new/actions";
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

describe("Rich Text Event Description", () => {
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

  it("saves markdown description when creating a new event", async () => {
    const mockInsert = {
      values: vi.fn().mockResolvedValue({}),
    };
    vi.mocked(db.insert).mockReturnValueOnce(mockInsert as any);

    const formData = new FormData();
    formData.set("title", "Hackathon 2026");
    formData.set("description", "## Schedule\n- 9:00 AM Check-in\n- 10:00 AM Keynote\n\n> Bring your laptops!");
    formData.set("date_time", "2026-09-15T09:00");
    formData.set("location", "Science Building Room 101");
    formData.set("max_capacity", "150");
    formData.set("price", "0");

    await createEventAction(formData);

    expect(mockInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Hackathon 2026",
        description: "## Schedule\n- 9:00 AM Check-in\n- 10:00 AM Keynote\n\n> Bring your laptops!",
        location: "Science Building Room 101",
        maxCapacity: 150,
        price: 0,
        organizerId: "org-1",
      }),
    );
  });

  it("updates markdown description when editing an existing event", async () => {
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
    formData.set("description", "### Speaker Lineup\n1. Dr. Turing\n2. Ada Lovelace\n\n[Register Details](https://campus.edu/ai)");
    formData.set("date_time", "2026-09-15T09:00");
    formData.set("location", "Grand Hall");
    formData.set("max_capacity", "300");
    formData.set("price", "5000");

    await updateEventAction(validEventId, formData);

    expect(mockUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Updated AI Symposium",
        description: "### Speaker Lineup\n1. Dr. Turing\n2. Ada Lovelace\n\n[Register Details](https://campus.edu/ai)",
        location: "Grand Hall",
        maxCapacity: 300,
        price: 5000,
      }),
    );
  });
});
