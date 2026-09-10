import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import * as middlewareUtils from "@/utils/supabase/middleware";

vi.mock("@/utils/supabase/middleware", () => ({
  updateSession: vi.fn(),
}));

describe("proxy routing & auth protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects logged-in user accessing /login to /", async () => {
    const fakeResponse = {
      cookies: {
        getAll: () => [
          { name: "sb-token", value: "xyz" },
        ],
      },
    };

    vi.mocked(middlewareUtils.updateSession).mockResolvedValue({
      supabaseResponse: fakeResponse as any,
      user: { id: "test-user-id" } as any,
    });

    const request = new NextRequest("http://localhost:3000/login");
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
    expect(response.cookies.get("sb-token")?.value).toBe("xyz");
  });

  it("allows unauthenticated user to access /login", async () => {
    const fakeResponse = {
      status: 200,
      cookies: {
        getAll: () => [],
      },
    };

    vi.mocked(middlewareUtils.updateSession).mockResolvedValue({
      supabaseResponse: fakeResponse as any,
      user: null,
    });

    const request = new NextRequest("http://localhost:3000/login");
    const response = await proxy(request);

    expect(response).toBe(fakeResponse);
  });

  it("redirects unauthenticated user accessing protected route to /login", async () => {
    const fakeResponse = {
      cookies: {
        getAll: () => [],
      },
    };

    vi.mocked(middlewareUtils.updateSession).mockResolvedValue({
      supabaseResponse: fakeResponse as any,
      user: null,
    });

    const request = new NextRequest("http://localhost:3000/dashboard");
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("returns 401 for unauthenticated API requests", async () => {
    const fakeResponse = {
      cookies: {
        getAll: () => [],
      },
    };

    vi.mocked(middlewareUtils.updateSession).mockResolvedValue({
      supabaseResponse: fakeResponse as any,
      user: null,
    });

    const request = new NextRequest("http://localhost:3000/api/check-in");
    const response = await proxy(request);

    expect(response.status).toBe(401);
  });

  it("allows authenticated user to access protected routes", async () => {
    const fakeResponse = {
      status: 200,
      cookies: {
        getAll: () => [],
      },
    };

    vi.mocked(middlewareUtils.updateSession).mockResolvedValue({
      supabaseResponse: fakeResponse as any,
      user: { id: "test-user-id" } as any,
    });

    const request = new NextRequest("http://localhost:3000/dashboard");
    const response = await proxy(request);

    expect(response).toBe(fakeResponse);
  });
});
