import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateDeveloperNameAction } from "@/app/(developer)/developer/profile/actions";
import { db } from "@/utils/db";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

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
  const updateMock = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  });
  return {
    db: {
      update: updateMock,
    },
  };
});

describe("Developer Profile Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error if user is not authenticated", async () => {
    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as any);

    const formData = new FormData();
    formData.append("fullName", "Core Maintainer");

    const result = await updateDeveloperNameAction({}, formData);
    expect(result).toEqual({
      error: "You must be signed in to update your profile.",
    });
  });

  it("returns error if name is empty or only whitespace", async () => {
    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "dev-123", email: "dev@cetdis.edu" } },
        }),
      },
    } as any);

    const formData = new FormData();
    formData.append("fullName", "   ");

    const result = await updateDeveloperNameAction({}, formData);
    expect(result).toEqual({
      error: "Full name is required.",
    });
  });

  it("returns error if name is less than 2 characters", async () => {
    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "dev-123", email: "dev@cetdis.edu" } },
        }),
      },
    } as any);

    const formData = new FormData();
    formData.append("fullName", "D");

    const result = await updateDeveloperNameAction({}, formData);
    expect(result).toEqual({
      error: "Name must be at least 2 characters long.",
    });
  });

  it("returns error if name exceeds 80 characters", async () => {
    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "dev-123", email: "dev@cetdis.edu" } },
        }),
      },
    } as any);

    const formData = new FormData();
    formData.append("fullName", "X".repeat(81));

    const result = await updateDeveloperNameAction({}, formData);
    expect(result).toEqual({
      error: "Name cannot exceed 80 characters.",
    });
  });

  it("successfully updates developer name and revalidates developer paths", async () => {
    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "dev-123", email: "dev@cetdis.edu" } },
        }),
      },
    } as any);

    const formData = new FormData();
    formData.append("fullName", "  Lead Engineer  ");

    const result = await updateDeveloperNameAction({}, formData);

    expect(result).toEqual({
      success: true,
      message: "Developer display name updated successfully.",
    });

    expect(db.update).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/developer/profile");
    expect(revalidatePath).toHaveBeenCalledWith("/developer/dashboard");
  });
});
