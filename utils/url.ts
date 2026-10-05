/**
 * Dynamically resolves the base URL across environments:
 * 1. Browser: Uses window.location.origin
 * 2. Vercel Production: Uses VERCEL_PROJECT_PRODUCTION_URL (e.g. CEDIS.com)
 * 3. Vercel Preview Branch: Uses VERCEL_URL (e.g. CEDIS-git-branch.vercel.app)
 * 4. Local Development: Uses NEXT_PUBLIC_APP_URL or fallback http://localhost:3000
 */
export function getBaseUrl(): string {
  // 1. If running in the browser, use the actual window URL
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // 2. If running on Vercel Production
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  // 3. If running on a Vercel Preview Branch
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // 4. Fallback for Local Development
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
