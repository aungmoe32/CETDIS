This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.
The content has been processed where comments have been removed, empty lines have been removed.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: **/*.js, **/*.ts, **/*.tsx, **/*.jsx
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Code comments have been removed from supported file types
- Empty lines have been removed from all files

## Additional Info

# Directory Structure
```
__tests__/
  offline-checkin.test.ts
  sync.test.ts
app/
  (auth)/
    login/
      actions.ts
      page.tsx
  (organizer)/
    admin/
      actions.ts
      page.tsx
    dashboard/
      page.tsx
    events/
      new/
        actions.ts
        page.tsx
    scan/
      actions.ts
      page.tsx
      scanner.tsx
    layout.tsx
  (student)/
    events/
      [id]/
        actions.ts
        page.tsx
      page.tsx
    my-id/
      page.tsx
      qr-display.tsx
    layout.tsx
  ~offline/
    page.tsx
  api/
    checkin/
      sync/
        route.ts
  serwist/
    [path]/
      route.ts
  layout.tsx
  page.tsx
  sw.ts
drizzle/
  schema.ts
lib/
  idb.ts
  offline-checkin.ts
  sync.ts
utils/
  supabase/
    client.ts
    middleware.ts
    server.ts
  db.ts
drizzle.config.ts
next.config.ts
proxy.ts
vitest.config.ts
vitest.setup.ts
```

# Files

## File: __tests__/offline-checkin.test.ts
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { offlineCheckIn } from "@/lib/offline-checkin";
import * as idb from "@/lib/idb";
vi.mock("@/lib/idb");
const mockTicket = {
  ticket_id: "ticket-123",
  check_in_token: "token-uuid-abc",
  full_name: "John Doe",
  is_checked_in: false,
};
describe("offlineCheckIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("Condition A: returns not_found when token is not in local DB", async () => {
    vi.mocked(idb.getTicketByToken).mockResolvedValue(undefined);
    const result = await offlineCheckIn("unknown-token");
    expect(result.status).toBe("not_found");
    expect(idb.markCheckedInLocally).not.toHaveBeenCalled();
    expect(idb.addToSyncQueue).not.toHaveBeenCalled();
  });
  it("Condition B: returns already_scanned when ticket is already checked in", async () => {
    vi.mocked(idb.getTicketByToken).mockResolvedValue({
      ...mockTicket,
      is_checked_in: true,
    });
    const result = await offlineCheckIn("token-uuid-abc");
    expect(result.status).toBe("already_scanned");
    expect(idb.markCheckedInLocally).not.toHaveBeenCalled();
  });
  it("Condition C: marks checked in and adds to sync queue on success", async () => {
    vi.mocked(idb.getTicketByToken).mockResolvedValue(mockTicket);
    vi.mocked(idb.markCheckedInLocally).mockResolvedValue(undefined);
    vi.mocked(idb.addToSyncQueue).mockResolvedValue(undefined);
    const result = await offlineCheckIn("token-uuid-abc");
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.fullName).toBe("John Doe");
    }
    expect(idb.markCheckedInLocally).toHaveBeenCalledWith("ticket-123");
    expect(idb.addToSyncQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        ticket_id: "ticket-123",
        sync_status: "pending",
      }),
    );
  });
});
```

## File: __tests__/sync.test.ts
```typescript
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
  it("handles network failure gracefully without throwing", async () => {
    vi.mocked(idb.getPendingSyncs).mockResolvedValue(pendingEntries);
    vi.mocked(fetch).mockRejectedValue(new Error("Network Error"));
    await expect(flushSyncQueue()).resolves.not.toThrow();
    expect(idb.markSyncCompleted).not.toHaveBeenCalled();
  });
});
```

## File: app/(auth)/login/actions.ts
```typescript
"use server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
export async function sendOtp(formData: FormData) {
  const email = formData.get("email") as string;
  if (!email) return { error: "Email is required" };
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) return { error: error.message };
  return { success: true };
}
export async function verifyOtp(formData: FormData) {
  const email = formData.get("email") as string;
  const token = formData.get("token") as string;
  if (!email || !token) return { error: "Email and OTP are required" };
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (error) return { error: error.message };
  if (!data.user) return { error: "Verification failed" };
  const { db } = await import("@/utils/db");
  const { profiles } = await import("@/drizzle/schema");
  await db
    .insert(profiles)
    .values({
      id: data.user.id,
      email: data.user.email!,
      fullName: data.user.user_metadata?.full_name ?? "",
    })
    .onConflictDoNothing();
  redirect("/my-id");
}
export async function signOut() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut();
  redirect("/login");
}
```

## File: app/(auth)/login/page.tsx
```typescript
"use client";
import { useActionState, useState } from "react";
import { sendOtp, verifyOtp } from "./actions";
interface ActionState {
  error?: string;
  success?: boolean;
}
const initialState: ActionState = {};
export default function LoginPage() {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [sendState, sendAction, sendPending] = useActionState(
    async (prev: ActionState, formData: FormData): Promise<ActionState> => {
      const result = await sendOtp(formData);
      if (result?.success) {
        setEmail(formData.get("email") as string);
        setStep("otp");
      }
      return result ?? prev;
    },
    initialState,
  );
  const [verifyState, verifyAction, verifyPending] = useActionState(
    async (prev: ActionState, formData: FormData): Promise<ActionState> => {
      const result = await verifyOtp(formData);
      return result ?? prev;
    },
    initialState,
  );
  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          {step === "email" ? "Sign in to CETDIS" : "Check your email"}
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          {step === "email"
            ? "Enter your campus email to receive a one-time code."
            : `We sent a 6-digit code to ${email}.`}
        </p>
        {step === "email" ? (
          <form action={sendAction} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@university.edu"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {sendState.error && (
              <p className="text-sm text-red-600">{sendState.error}</p>
            )}
            <button
              type="submit"
              disabled={sendPending}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {sendPending ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form action={verifyAction} className="space-y-4">
            <input type="hidden" name="email" value={email} />
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1">
                One-time code
              </label>
              <input
                id="token"
                name="token"
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                placeholder="123456"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {verifyState.error && (
              <p className="text-sm text-red-600">{verifyState.error}</p>
            )}
            <button
              type="submit"
              disabled={verifyPending}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {verifyPending ? "Verifying…" : "Verify code"}
            </button>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              ← Use a different email
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
```

## File: app/(organizer)/admin/actions.ts
```typescript
"use server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { profiles } from "@/drizzle/schema";
import { eq, ilike } from "drizzle-orm";
import { randomUUID } from "crypto";
export async function searchStudentsAction(formData: FormData) {
  const query = formData.get("query") as string;
  if (!query?.trim()) return { data: [] };
  const results = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      email: profiles.email,
      role: profiles.role,
    })
    .from(profiles)
    .where(ilike(profiles.fullName, `%${query}%`))
    .limit(20);
  return { data: results };
}
export async function revokeTokenAction(userId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const newToken = randomUUID();
  await db
    .update(profiles)
    .set({ checkInToken: newToken })
    .where(eq(profiles.id, userId));
  return { success: true };
}
```

## File: app/(organizer)/admin/page.tsx
```typescript
"use client";
import { useActionState, useState } from "react";
import { searchStudentsAction, revokeTokenAction } from "./actions";
const initialState = { data: [] as { id: string; fullName: string; email: string; role: string }[] };
export default function AdminPage() {
  const [results, searchAction, pending] = useActionState(
    async (_: typeof initialState, formData: FormData) => {
      return await searchStudentsAction(formData);
    },
    initialState,
  );
  const [revokedIds, setRevokedIds] = useState<Set<string>>(new Set());
  const [revoking, setRevoking] = useState<string | null>(null);
  const handleRevoke = async (userId: string) => {
    setRevoking(userId);
    const result = await revokeTokenAction(userId);
    if (result.success) {
      setRevokedIds((prev) => new Set([...prev, userId]));
    }
    setRevoking(null);
  };
  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Admin — Student Lookup</h1>
      <form action={searchAction} className="flex gap-2 mb-6">
        <input
          name="query"
          type="text"
          placeholder="Search by name…"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending ? "…" : "Search"}
        </button>
      </form>
      {results.data.length > 0 && (
        <ul className="divide-y divide-gray-100">
          {results.data.map((student) => (
            <li key={student.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{student.fullName}</p>
                <p className="text-xs text-gray-400">{student.email}</p>
              </div>
              {student.role === "student" && (
                <button
                  onClick={() => handleRevoke(student.id)}
                  disabled={revoking === student.id}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    revokedIds.has(student.id)
                      ? "bg-green-50 text-green-600 border border-green-200"
                      : "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                  }`}
                >
                  {revokedIds.has(student.id)
                    ? "✓ Token revoked"
                    : revoking === student.id
                    ? "Revoking…"
                    : "Revoke Tag"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## File: app/(organizer)/dashboard/page.tsx
```typescript
import { db } from "@/utils/db";
import { events, tickets } from "@/drizzle/schema";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { count, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
export const metadata = { title: "Dashboard" };
export default async function DashboardPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const myEvents = await db
    .select({
      id: events.id,
      title: events.title,
      dateTime: events.dateTime,
      location: events.location,
      maxCapacity: events.maxCapacity,
    })
    .from(events)
    .where(eq(events.organizerId, user.id))
    .orderBy(events.dateTime);
  const ticketCounts = await db
    .select({ eventId: tickets.eventId, total: count(), checkedIn: count(tickets.isCheckedIn) })
    .from(tickets)
    .groupBy(tickets.eventId);
  const statsMap = Object.fromEntries(
    ticketCounts.map((t) => [t.eventId, t]),
  );
  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Your Events</h1>
        <Link
          href="/events/new"
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
        >
          + Create Event
        </Link>
      </div>
      {myEvents.length === 0 && (
        <p className="text-sm text-gray-400">No events yet. Create one to get started.</p>
      )}
      <ul className="space-y-3">
        {myEvents.map((event) => {
          const stats = statsMap[event.id];
          const total = stats?.total ?? 0;
          const checkedIn = stats?.checkedIn ?? 0;
          return (
            <li key={event.id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900">{event.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(event.dateTime).toLocaleString()} · {event.location}
                  </p>
                </div>
                <Link
                  href={`/scan?event=${event.id}`}
                  className="shrink-0 rounded-lg border border-indigo-200 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                >
                  Scan
                </Link>
              </div>
              <div className="mt-3 flex gap-4 text-xs text-gray-500">
                <span>{total} registered</span>
                <span>{checkedIn} checked in</span>
                <span>{event.maxCapacity - total} spots left</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

## File: app/(organizer)/events/new/actions.ts
```typescript
"use server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { events } from "@/drizzle/schema";
import { redirect } from "next/navigation";
interface ActionResult {
  error?: string;
}
export async function createEventAction(formData: FormData): Promise<ActionResult | void> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const title = formData.get("title") as string;
  const dateTime = formData.get("date_time") as string;
  const location = formData.get("location") as string;
  const maxCapacity = parseInt(formData.get("max_capacity") as string, 10);
  if (!title || !dateTime || !maxCapacity) {
    return { error: "Title, date/time, and capacity are required" };
  }
  await db.insert(events).values({
    title,
    dateTime: new Date(dateTime),
    location: location || null,
    maxCapacity,
    organizerId: user.id,
  });
  redirect("/dashboard");
}
```

## File: app/(organizer)/events/new/page.tsx
```typescript
"use client";
import { useActionState } from "react";
import { createEventAction } from "./actions";
interface State {
  error?: string;
}
const initialState: State = {};
export default function CreateEventPage() {
  const [state, formAction, pending] = useActionState(
    async (prev: State, formData: FormData): Promise<State> => {
      const result = await createEventAction(formData);
      return result ?? prev;
    },
    initialState,
  );
  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Create Event</h1>
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Event Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="Spring IT Hackathon"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="date_time" className="block text-sm font-medium text-gray-700 mb-1">
            Date &amp; Time
          </label>
          <input
            id="date_time"
            name="date_time"
            type="datetime-local"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <input
            id="location"
            name="location"
            type="text"
            placeholder="Main Hall"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="max_capacity" className="block text-sm font-medium text-gray-700 mb-1">
            Max Capacity
          </label>
          <input
            id="max_capacity"
            name="max_capacity"
            type="number"
            required
            min={1}
            placeholder="200"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {state.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {pending ? "Creating…" : "Create Event"}
        </button>
      </form>
    </div>
  );
}
```

## File: app/(organizer)/scan/actions.ts
```typescript
"use server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { profiles, tickets } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
export type CheckInResult =
  | { status: "success"; fullName: string }
  | { status: "not_found" }
  | { status: "already_scanned" }
  | { status: "error"; message: string };
export async function checkInAction(
  token: string,
  eventId: string,
): Promise<CheckInResult> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Not authenticated" };
  const [profile] = await db
    .select({ id: profiles.id, fullName: profiles.fullName })
    .from(profiles)
    .where(eq(profiles.checkInToken, token))
    .limit(1);
  if (!profile) return { status: "not_found" };
  const [ticket] = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.userId, profile.id), eq(tickets.eventId, eventId)))
    .limit(1);
  if (!ticket) return { status: "not_found" };
  if (ticket.isCheckedIn) return { status: "already_scanned" };
  await db
    .update(tickets)
    .set({ isCheckedIn: true, scannedAt: new Date() })
    .where(eq(tickets.id, ticket.id));
  return { status: "success", fullName: profile.fullName };
}
export async function loadGuestListAction(eventId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const guestList = await db
    .select({
      ticket_id: tickets.id,
      check_in_token: profiles.checkInToken,
      full_name: profiles.fullName,
      is_checked_in: tickets.isCheckedIn,
    })
    .from(tickets)
    .innerJoin(profiles, eq(tickets.userId, profiles.id))
    .where(eq(tickets.eventId, eventId));
  return { data: guestList };
}
```

## File: app/(organizer)/scan/page.tsx
```typescript
import { notFound } from "next/navigation";
import { db } from "@/utils/db";
import { events } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import Scanner from "./scanner";
interface Props {
  searchParams: Promise<{ event?: string }>;
}
export const metadata = { title: "Scanner" };
export default async function ScanPage({ searchParams }: Props) {
  const { event: eventId } = await searchParams;
  if (!eventId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <p className="text-gray-500 text-sm">No event selected.</p>
        <p className="text-xs text-gray-400 mt-1">
          Open the scanner from your Dashboard.
        </p>
      </div>
    );
  }
  const [event] = await db
    .select({ id: events.id, title: events.title })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!event) notFound();
  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-4 py-3 border-b border-gray-100 bg-white">
        <p className="text-xs text-gray-500">Scanning for</p>
        <p className="font-semibold text-gray-900 text-sm">{event.title}</p>
      </div>
      <Scanner eventId={event.id} />
    </div>
  );
}
```

## File: app/(organizer)/scan/scanner.tsx
```typescript
"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { checkInAction, loadGuestListAction } from "./actions";
import { offlineCheckIn } from "@/lib/offline-checkin";
import { flushSyncQueue } from "@/lib/sync";
import { saveGuestList } from "@/lib/idb";
import type { CheckInResult } from "./actions";
interface Props {
  eventId: string;
}
type ScanStatus = "idle" | "scanning" | "success" | "already_scanned" | "not_found" | "error";
export default function Scanner({ eventId }: Props) {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [message, setMessage] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [offlineEnabled, setOfflineEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const activeRef = useRef(false);
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      flushSyncQueue();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  const handleResult = useCallback((result: CheckInResult) => {
    if (result.status === "success") {
      setStatus("success");
      setMessage(result.fullName);
    } else if (result.status === "already_scanned") {
      setStatus("already_scanned");
      setMessage("Already checked in");
    } else {
      setStatus("not_found");
      setMessage("Not on guest list");
    }
    setTimeout(() => {
      setStatus("idle");
      setMessage("");
    }, 3000);
  }, []);
  const startScanner = useCallback(() => {
    const qrRegion = document.getElementById("qr-reader");
    if (!qrRegion) return;
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;
    activeRef.current = true;
    setStatus("scanning");
    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      async (decodedText) => {
        if (!activeRef.current) return;
        const token = decodedText.split("/").pop() ?? decodedText;
        activeRef.current = false;
        await scanner.stop();
        if (!isOnline || offlineEnabled) {
          const result = await offlineCheckIn(token);
          handleResult(result as CheckInResult);
        } else {
          const result = await checkInAction(token, eventId);
          handleResult(result);
        }
      },
      undefined,
    );
  }, [eventId, isOnline, offlineEnabled, handleResult]);
  const enableOfflineMode = async () => {
    setIsLoading(true);
    const result = await loadGuestListAction(eventId);
    if (result.error) {
      alert(result.error);
    } else if (result.data) {
      await saveGuestList(result.data);
      setOfflineEnabled(true);
      alert(`Guest list downloaded: ${result.data.length} attendees`);
    }
    setIsLoading(false);
  };
  const statusColors: Record<ScanStatus, string> = {
    idle: "bg-gray-50",
    scanning: "bg-gray-50",
    success: "bg-green-500",
    already_scanned: "bg-yellow-400",
    not_found: "bg-red-500",
    error: "bg-red-500",
  };
  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${statusColors[status]}`}>
      {}
      {status !== "idle" && status !== "scanning" && (
        <div className="flex flex-col items-center justify-center flex-1 px-4">
          <p className="text-white text-4xl font-bold mb-2">
            {status === "success" ? "✓" : "✗"}
          </p>
          <p className="text-white text-2xl font-semibold">{message}</p>
          {status === "success" && (
            <p className="text-white/80 text-sm mt-1">Check-in successful</p>
          )}
        </div>
      )}
      {}
      {(status === "idle" || status === "scanning") && (
        <div className="flex flex-col items-center justify-center flex-1 px-4 py-8 gap-4">
          <div id="qr-reader" className="w-full max-w-xs rounded-xl overflow-hidden" />
          {status === "idle" && (
            <button
              onClick={startScanner}
              className="w-full max-w-xs rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Start Scanner
            </button>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-400"}`} />
            <span className="text-xs text-gray-500">
              {isOnline ? "Online" : "Offline"}{offlineEnabled ? " · Offline mode enabled" : ""}
            </span>
          </div>
          {!offlineEnabled && (
            <button
              onClick={enableOfflineMode}
              disabled={isLoading || !isOnline}
              className="text-xs text-indigo-600 hover:underline disabled:opacity-40"
            >
              {isLoading ? "Downloading guest list…" : "Enable Offline Mode"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

## File: app/(organizer)/layout.tsx
```typescript
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { profiles } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "@/app/(auth)/login/actions";
export default async function OrganizerLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);
  if (!profile) redirect("/login");
  if (profile.role === "student") redirect("/my-id");
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-gray-900 text-sm">CETDIS · Organizer</span>
        <form action={signOut}>
          <button className="text-xs text-gray-400 hover:text-gray-600">Sign out</button>
        </form>
      </header>
      <div className="flex flex-1">
        <nav className="w-44 border-r border-gray-100 p-4 space-y-1 hidden sm:block">
          <Link href="/dashboard" className="block px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-indigo-600">
            Dashboard
          </Link>
          <Link href="/events/new" className="block px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-indigo-600">
            Create Event
          </Link>
          <Link href="/admin" className="block px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-indigo-600">
            Admin
          </Link>
        </nav>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
```

## File: app/(student)/events/[id]/actions.ts
```typescript
"use server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { events, tickets } from "@/drizzle/schema";
import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
export async function rsvpAction(formData: FormData): Promise<void> {
  const eventId = formData.get("event_id") as string;
  if (!eventId) return;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [event] = await db
    .select({ maxCapacity: events.maxCapacity })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!event) return;
  const [{ ticketCount }] = await db
    .select({ ticketCount: count() })
    .from(tickets)
    .where(eq(tickets.eventId, eventId));
  if (ticketCount >= event.maxCapacity) {
    revalidatePath(`/events/${eventId}`);
    return;
  }
  try {
    await db.insert(tickets).values({
      userId: user.id,
      eventId,
    });
  } catch {
  }
  revalidatePath(`/events/${eventId}`);
}
```

## File: app/(student)/events/[id]/page.tsx
```typescript
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { events, tickets } from "@/drizzle/schema";
import { and, count, eq } from "drizzle-orm";
import { rsvpAction } from "./actions";
interface Props {
  params: Promise<{ id: string }>;
}
export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, id))
    .limit(1);
  if (!event) notFound();
  const [{ ticketCount }] = await db
    .select({ ticketCount: count() })
    .from(tickets)
    .where(eq(tickets.eventId, id));
  const [existingTicket] = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.userId, user.id), eq(tickets.eventId, id)))
    .limit(1);
  const isFull = ticketCount >= event.maxCapacity;
  const hasTicket = !!existingTicket;
  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">{event.title}</h1>
      <p className="text-sm text-gray-500 mb-1">
        {new Date(event.dateTime).toLocaleString()}
      </p>
      {event.location && (
        <p className="text-sm text-gray-500 mb-4">📍 {event.location}</p>
      )}
      <p className="text-sm text-gray-600 mb-6">
        {ticketCount} / {event.maxCapacity} registered
      </p>
      {hasTicket ? (
        <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-medium">
          ✓ You&apos;re registered for this event
        </div>
      ) : isFull ? (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          This event is full
        </div>
      ) : (
        <form action={rsvpAction}>
          <input type="hidden" name="event_id" value={id} />
          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            RSVP for this event
          </button>
        </form>
      )}
    </div>
  );
}
```

## File: app/(student)/events/page.tsx
```typescript
import { db } from "@/utils/db";
import { events, tickets } from "@/drizzle/schema";
import { count, eq, gte } from "drizzle-orm";
import Link from "next/link";
export const metadata = { title: "Events" };
export default async function EventsPage() {
  const now = new Date();
  const upcomingEvents = await db
    .select({
      id: events.id,
      title: events.title,
      dateTime: events.dateTime,
      location: events.location,
      maxCapacity: events.maxCapacity,
    })
    .from(events)
    .where(gte(events.dateTime, now))
    .orderBy(events.dateTime);
  const ticketCounts = await db
    .select({ eventId: tickets.eventId, count: count() })
    .from(tickets)
    .groupBy(tickets.eventId);
  const countMap = Object.fromEntries(
    ticketCounts.map((t) => [t.eventId, t.count]),
  );
  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Events</h1>
      {upcomingEvents.length === 0 && (
        <p className="text-sm text-gray-400">No upcoming events.</p>
      )}
      <ul className="space-y-3">
        {upcomingEvents.map((event) => {
          const taken = countMap[event.id] ?? 0;
          const spots = event.maxCapacity - taken;
          return (
            <li key={event.id}>
              <Link
                href={`/events/${event.id}`}
                className="block border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition"
              >
                <p className="font-medium text-gray-900">{event.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(event.dateTime).toLocaleString()} · {event.location}
                </p>
                <p className={`text-xs mt-1 font-medium ${spots > 0 ? "text-green-600" : "text-red-500"}`}>
                  {spots > 0 ? `${spots} spots left` : "Full"}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

## File: app/(student)/my-id/page.tsx
```typescript
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { profiles } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import QrDisplay from "./qr-display";
export const metadata = { title: "My Digital ID" };
export default async function MyIdPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);
  if (!profile) redirect("/login");
  const scanUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/scan/${profile.checkInToken}`;
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4 py-8">
      <div className="w-full max-w-xs bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
          <span className="text-indigo-600 font-bold text-lg">
            {profile.fullName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-900">{profile.fullName}</p>
          <p className="text-xs text-gray-400">{profile.email}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <QrDisplay value={scanUrl} />
        </div>
        <p className="text-xs text-gray-400 text-center">
          Show this QR code at the event entrance
        </p>
      </div>
    </div>
  );
}
```

## File: app/(student)/my-id/qr-display.tsx
```typescript
"use client";
import { QRCodeSVG } from "qrcode.react";
export default function QrDisplay({ value }: { value: string }) {
  return (
    <QRCodeSVG
      value={value}
      size={200}
      bgColor="#f9fafb"
      fgColor="#111827"
      level="M"
    />
  );
}
```

## File: app/(student)/layout.tsx
```typescript
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { profiles } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "@/app/(auth)/login/actions";
export default async function StudentLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);
  if (!profile) redirect("/login");
  if (profile.role === "organizer") redirect("/dashboard");
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-gray-900 text-sm">CETDIS</span>
        <form action={signOut}>
          <button className="text-xs text-gray-400 hover:text-gray-600">Sign out</button>
        </form>
      </header>
      <main className="flex-1">{children}</main>
      <nav className="border-t border-gray-100 flex">
        <Link href="/my-id" className="flex-1 py-3 text-center text-xs font-medium text-gray-600 hover:text-indigo-600">
          My ID
        </Link>
        <Link href="/events" className="flex-1 py-3 text-center text-xs font-medium text-gray-600 hover:text-indigo-600">
          Events
        </Link>
      </nav>
    </div>
  );
}
```

## File: app/~offline/page.tsx
```typescript
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Offline",
};
export default function Page() {
  return (
    <>
      <h1>You are offline</h1>
      <h2>When offline, any page route will fallback to this page</h2>
    </>
  );
}
```

## File: app/api/checkin/sync/route.ts
```typescript
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { tickets } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
interface SyncEntry {
  ticket_id: string;
  scanned_at: string;
}
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const entries: SyncEntry[] = await request.json();
  if (!Array.isArray(entries)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const results = await Promise.all(
    entries.map(async (entry) => {
      try {
        await db
          .update(tickets)
          .set({
            isCheckedIn: true,
            scannedAt: new Date(entry.scanned_at),
          })
          .where(eq(tickets.id, entry.ticket_id));
        return { ticket_id: entry.ticket_id, success: true };
      } catch {
        return { ticket_id: entry.ticket_id, success: false };
      }
    }),
  );
  return NextResponse.json({ results });
}
```

## File: app/serwist/[path]/route.ts
```typescript
import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";
const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ??
  crypto.randomUUID();
export const {
  dynamic,
  dynamicParams,
  revalidate,
  generateStaticParams,
  GET,
} = createSerwistRoute({
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
  swSrc: "app/sw.ts",
  useNativeEsbuild: true,
});
```

## File: app/layout.tsx
```typescript
import { SerwistProvider } from "@serwist/turbopack/react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const APP_NAME = "Cetdis";
const APP_DEFAULT_TITLE = "Cetdis App";
const APP_TITLE_TEMPLATE = "%s - Cetdis";
const APP_DESCRIPTION = "Cetdis App";
export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    shortcut: "/favicon.ico",
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
};
export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};
export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SerwistProvider swUrl="/serwist/sw.js">{children}</SerwistProvider>
      </body>
    </html>
  );
}
```

## File: app/page.tsx
```typescript
import Image from "next/image";
export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            To get started, edit the page.tsx file.
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Looking for a starting point or more instructions? Head over to{" "}
            <a
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Templates
            </a>{" "}
            or the{" "}
            <a
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Learning
            </a>{" "}
            center.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={16}
            />
            Deploy Now
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
```

## File: app/sw.ts
```typescript
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});
serwist.addEventListeners();
```

## File: drizzle/schema.ts
```typescript
import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
export const roleEnum = pgEnum("role", ["student", "organizer"]);
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: roleEnum("role").notNull().default("student"),
  checkInToken: uuid("check_in_token").notNull().unique().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  dateTime: timestamp("date_time", { withTimezone: true }).notNull(),
  location: text("location"),
  maxCapacity: integer("max_capacity").notNull(),
  organizerId: uuid("organizer_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    isCheckedIn: boolean("is_checked_in").notNull().default(false),
    scannedAt: timestamp("scanned_at", { withTimezone: true }),
  },
  (t) => [unique().on(t.userId, t.eventId)],
);
export const profilesRelations = relations(profiles, ({ many }) => ({
  organizedEvents: many(events),
  tickets: many(tickets),
}));
export const eventsRelations = relations(events, ({ one, many }) => ({
  organizer: one(profiles, {
    fields: [events.organizerId],
    references: [profiles.id],
  }),
  tickets: many(tickets),
}));
export const ticketsRelations = relations(tickets, ({ one }) => ({
  user: one(profiles, {
    fields: [tickets.userId],
    references: [profiles.id],
  }),
  event: one(events, {
    fields: [tickets.eventId],
    references: [events.id],
  }),
}));
```

## File: lib/idb.ts
```typescript
import { openDB, type IDBPDatabase } from "idb";
export interface CachedTicket {
  ticket_id: string;
  check_in_token: string;
  full_name: string;
  is_checked_in: boolean;
}
export interface SyncQueueEntry {
  ticket_id: string;
  scanned_at: string;
  sync_status: "pending" | "completed";
}
const DB_NAME = "cetdis-offline";
const DB_VERSION = 1;
let dbPromise: Promise<IDBPDatabase> | null = null;
function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("cached_tickets")) {
          const store = db.createObjectStore("cached_tickets", {
            keyPath: "ticket_id",
          });
          store.createIndex("by_token", "check_in_token", { unique: true });
        }
        if (!db.objectStoreNames.contains("sync_queue")) {
          db.createObjectStore("sync_queue", { keyPath: "ticket_id" });
        }
      },
    });
  }
  return dbPromise;
}
export async function saveGuestList(tickets: CachedTicket[]) {
  const db = await getDb();
  const tx = db.transaction("cached_tickets", "readwrite");
  await tx.objectStore("cached_tickets").clear();
  for (const ticket of tickets) {
    await tx.objectStore("cached_tickets").put(ticket);
  }
  await tx.done;
}
export async function getTicketByToken(
  token: string,
): Promise<CachedTicket | undefined> {
  const db = await getDb();
  const index = db
    .transaction("cached_tickets", "readonly")
    .objectStore("cached_tickets")
    .index("by_token");
  return index.get(token);
}
export async function markCheckedInLocally(ticketId: string) {
  const db = await getDb();
  const tx = db.transaction("cached_tickets", "readwrite");
  const store = tx.objectStore("cached_tickets");
  const ticket = await store.get(ticketId);
  if (ticket) {
    ticket.is_checked_in = true;
    await store.put(ticket);
  }
  await tx.done;
}
export async function addToSyncQueue(entry: SyncQueueEntry) {
  const db = await getDb();
  await db.put("sync_queue", entry);
}
export async function getPendingSyncs(): Promise<SyncQueueEntry[]> {
  const db = await getDb();
  const all: SyncQueueEntry[] = await db.getAll("sync_queue");
  return all.filter((e) => e.sync_status === "pending");
}
export async function markSyncCompleted(ticketId: string) {
  const db = await getDb();
  await db.delete("sync_queue", ticketId);
}
export async function clearSyncQueue() {
  const db = await getDb();
  await db.clear("sync_queue");
}
```

## File: lib/offline-checkin.ts
```typescript
import type { CachedTicket } from "./idb";
import {
  getTicketByToken,
  markCheckedInLocally,
  addToSyncQueue,
} from "./idb";
export type CheckInResult =
  | { status: "success"; fullName: string }
  | { status: "not_found" }
  | { status: "already_scanned" };
export async function offlineCheckIn(token: string): Promise<CheckInResult> {
  const ticket: CachedTicket | undefined = await getTicketByToken(token);
  if (!ticket) {
    return { status: "not_found" };
  }
  if (ticket.is_checked_in) {
    return { status: "already_scanned" };
  }
  const scannedAt = new Date().toISOString();
  await markCheckedInLocally(ticket.ticket_id);
  await addToSyncQueue({
    ticket_id: ticket.ticket_id,
    scanned_at: scannedAt,
    sync_status: "pending",
  });
  return { status: "success", fullName: ticket.full_name };
}
```

## File: lib/sync.ts
```typescript
import { getPendingSyncs, markSyncCompleted } from "./idb";
export async function flushSyncQueue(): Promise<void> {
  const pending = await getPendingSyncs();
  if (pending.length === 0) return;
  try {
    const res = await fetch("/api/checkin/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pending),
    });
    if (!res.ok) {
      console.error("[sync] Server returned", res.status);
      return;
    }
    const { results } = await res.json() as {
      results: { ticket_id: string; success: boolean }[];
    };
    for (const result of results) {
      if (result.success) {
        await markSyncCompleted(result.ticket_id);
      }
    }
  } catch (err) {
    console.warn("[sync] Flush failed, will retry:", err);
  }
}
```

## File: utils/supabase/client.ts
```typescript
import { createBrowserClient } from "@supabase/ssr";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const createClient = () =>
  createBrowserClient(
    supabaseUrl!,
    supabaseKey!,
  );
```

## File: utils/supabase/middleware.ts
```typescript
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const createClient = (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    },
  );
  return supabaseResponse
};
```

## File: utils/supabase/server.ts
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const createClient = (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
          }
        },
      },
    },
  );
};
```

## File: utils/db.ts
```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/drizzle/schema";
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
```

## File: drizzle.config.ts
```typescript
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

## File: next.config.ts
```typescript
import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
};
export default withSerwist(nextConfig);
```

## File: proxy.ts
```typescript
import { createClient } from "@/utils/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";
const PUBLIC_PATHS = ["/login"];
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return createClient(request);
  }
  const supabaseResponse = createClient(request);
  const { createServerClient } = await import("@supabase/ssr");
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return supabaseResponse;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|serwist).*)",
  ],
};
```

## File: vitest.config.ts
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

## File: vitest.setup.ts
```typescript
import "@testing-library/jest-dom";
```
