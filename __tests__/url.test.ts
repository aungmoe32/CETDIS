import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getBaseUrl } from "@/utils/url";

describe("getBaseUrl helper", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns window.location.origin when executed in browser", () => {
    const originalWindow = (globalThis as any).window;
    (globalThis as any).window = {
      location: {
        origin: "https://campus-preview.local:4000",
      },
    };

    expect(getBaseUrl()).toBe("https://campus-preview.local:4000");

    (globalThis as any).window = originalWindow;
  });

  it("returns https protocol + VERCEL_PROJECT_PRODUCTION_URL on production", () => {
    const originalWindow = (globalThis as any).window;
    delete (globalThis as any).window;

    process.env.VERCEL_PROJECT_PRODUCTION_URL = "cetdis.com";

    expect(getBaseUrl()).toBe("https://cetdis.com");

    (globalThis as any).window = originalWindow;
  });

  it("returns https protocol + VERCEL_URL on preview branches", () => {
    const originalWindow = (globalThis as any).window;
    delete (globalThis as any).window;

    process.env.VERCEL_URL = "cetdis-git-feature-branch.vercel.app";

    expect(getBaseUrl()).toBe("https://cetdis-git-feature-branch.vercel.app");

    (globalThis as any).window = originalWindow;
  });

  it("falls back to NEXT_PUBLIC_APP_URL in local environment", () => {
    const originalWindow = (globalThis as any).window;
    delete (globalThis as any).window;

    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:4000";

    expect(getBaseUrl()).toBe("http://localhost:4000");

    (globalThis as any).window = originalWindow;
  });

  it("falls back to http://localhost:3000 if no env vars are defined", () => {
    const originalWindow = (globalThis as any).window;
    delete (globalThis as any).window;

    expect(getBaseUrl()).toBe("http://localhost:3000");

    (globalThis as any).window = originalWindow;
  });
});
