# CETDIS — Full Project Context & Architecture Guide

> **Campus Event Check-In System (CETDIS)**  
> A Next.js 16 Progressive Web Application built for high-throughput campus event ticketing, door check-in, offline synchronization, and physical Universal NFC pass management.

---

## 1. Project Overview & Philosophy

### Core Mission

CETDIS bridges digital campus identities with physical event entry. Students can RSVP to campus events, view their digital student pass, or tap in at the door using physical NFC wristbands/cards. Organizers can validate attendees using camera QR scanners or NFC hardware even in dead zones with zero internet connectivity.

### Key Architectural Pillars

1. **Offline-First Reliability**: Events often happen in campus basements or outdoor spaces with poor connectivity. The scanner downloads an event's guest list into browser IndexedDB, processes check-ins locally with instant sub-10ms response times, and flushes synced check-ins to the cloud when connectivity resumes.
2. **Universal Identity Model**: Check-in tokens belong to the student profile (`profiles.checkInToken`), not individual event tickets. One QR code or physical NFC wristband works across all events the student registers for.
3. **Decoupled Security & Token Revocation**: If a student loses their physical NFC tag, they can report it lost to immediately rotate their `checkInToken` UUID. This instantly destroys the lost tag's access while keeping their account and event registrations intact.
4. **Platform Supply Chain Ledger**: Platform collects NFC hardware revenue centrally. An immutable audit trail (`nfc_issuances`) tracks every physical tag handover. A separate mutable ledger (`nfc_allocations`) tracks blank tag rolls shipped by the platform developer to each organizer, enabling inventory forecasting and low-stock alerting.

---

## 2. Technology Stack

| Layer                    | Technology                                  | Rationale                                                                                                                                |
| :----------------------- | :------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework**            | **Next.js 16 (App Router)**                 | Modern React Server Components, Server Actions in colocated `actions.ts`, and root `proxy.ts` (replacing deprecated `middleware.ts`).    |
| **Styling**              | **Tailwind CSS v4**                         | Clean, minimalist white aesthetic with zero heavy external UI component libraries.                                                       |
| **Authentication**       | **Supabase Auth**                           | Passwordless Email OTP (`supabase.auth.signInWithOtp`).                                                                                  |
| **Database & ORM**       | **PostgreSQL + Drizzle ORM**                | Type-safe schema definitions and SQL queries via `drizzle-orm`. Direct Supabase client is reserved strictly for auth session management. |
| **Offline Storage**      | **IndexedDB (`idb`)**                       | Client-side database caching event attendees, check-in statuses, NFC issuance states, and sync queues.                                   |
| **PWA & Service Worker** | **Serwist**                                 | Service worker caching static assets, shell HTML, and background synchronization events.                                                 |
| **Hardware / Scanning**  | **`html5-qrcode` & Web NFC (`NDEFReader`)** | Camera QR scanning with cleanup safeguards + native Web NFC reading/writing with simulation fallbacks for iOS/desktop.                   |
| **Testing**              | **Vitest**                                  | Fast unit and integration tests with mocked DB and session layers.                                                                       |

---

## 3. Database Architecture & Schema (`drizzle/schema.ts`)

```mermaid
erDiagram
    PROFILES ||--o{ EVENTS : organizes
    PROFILES ||--o{ TICKETS : holds
    EVENTS ||--o{ TICKETS : contains
    PROFILES ||--o{ NFC_ISSUANCES : receives
    PROFILES ||--o{ NFC_ISSUANCES : issues
    EVENTS ||--o{ NFC_ISSUANCES : context
    PROFILES ||--o{ NFC_ALLOCATIONS : receives

    PROFILES {
        uuid id PK "Mirrors auth.users.id"
        text email "Unique"
        text full_name
        role_enum role "'student' | 'organizer' | 'developer'"
        uuid check_in_token "Unique student UUID"
        boolean purchased_nfc "Has student paid for tag"
        boolean nfc_issued "Has physical tag been linked"
        timestamp created_at
    }

    EVENTS {
        uuid id PK
        text title
        timestamp date_time
        text location
        integer max_capacity
        integer price "0 = Free"
        uuid organizer_id FK
        timestamp created_at
    }

    TICKETS {
        uuid id PK
        uuid user_id FK
        uuid event_id FK "Unique (user_id, event_id)"
        boolean is_checked_in
        timestamp scanned_at
    }

    NFC_ISSUANCES {
        uuid id PK
        uuid user_id FK "The Student"
        uuid issued_by FK "The Organizer"
        uuid event_id FK "Optional Event Context"
        timestamp issued_at
    }

    NFC_ALLOCATIONS {
        uuid id PK
        uuid organizer_id FK "The Organizer"
        integer amount "Number of blank tags shipped"
        text notes "Optional batch notes"
        timestamp allocated_at
    }
```

### Table Definitions

1. **`profiles`**:
   - `id`: Primary key matching `auth.users.id`.
   - `role`: `'student' | 'organizer' | 'developer'`. Developer is a platform admin role.
   - `checkInToken`: Randomly generated UUID string representing the student's universal identity token.
   - `purchasedNfc`: Tracks if the student completed checkout for a physical NFC pass.
   - `nfcIssued`: Tracks if an organizer has programmed and handed over a physical NFC tag.
2. **`events`**:
   - Holds event metadata, capacity limits, pricing in MMK, and organizer references.
3. **`tickets`**:
   - Bridge table between student profile and event.
   - Unique composite constraint on `(user_id, event_id)`.
   - Tracks `is_checked_in` and `scanned_at`.
4. **`nfc_issuances`**:
   - Strictly insert-only audit ledger recording every physical tag programming and handover.
5. **`nfc_allocations`**:
   - Mutable ledger recording every batch of blank NFC tag rolls shipped from the platform developer to a specific organizer.
   - `amount`: The count of blank tags in the shipment.
   - `notes`: Optional free-text batch descriptor (e.g. "Mailed Starter Kit", "Handed at event").
   - Stock remaining for an organizer = `SUM(nfc_allocations.amount) - COUNT(nfc_issuances)`.

---

## 4. Application Architecture & Routing Structure

```
cetdis/
├── app/
│   ├── (auth)/                         # Auth Route Group
│   │   ├── login/                      # Passwordless OTP login
│   │   └── verify/                     # OTP verification page
│   ├── (student)/                      # Student Route Group
│   │   ├── events/                     # Event discovery & RSVP
│   │   ├── tickets/                    # My registered event tickets
│   │   └── my-id/                      # Universal Digital ID & NFC Tag Pass
│   │       ├── page.tsx                # Digital QR card + NFC section
│   │       ├── nfc-section.tsx         # 3-State lifecycle & Lost Tag flow
│   │       ├── nfc-checkout-modal.tsx  # Payment checkout modal (KBZPay/WavePay)
│   │       └── actions.ts              # purchaseNfcAction & reportLostTagAction
│   ├── (organizer)/                    # Organizer Route Group
│   │   ├── dashboard/                  # Metrics, events, NFC inventory card & low-stock banner
│   │   ├── events/new/                 # Create event
│   │   ├── scan/                       # Door check-in scanner (QR + NFC)
│   │   │   ├── page.tsx
│   │   │   ├── scanner.tsx             # Unified camera/NFC scanning + offline queue
│   │   │   └── actions.ts              # checkInAction, loadGuestListAction, markNfcIssuedAction
│   │   └── admin/                      # Student lookup & NFC Tag Programming
│   │       ├── page.tsx
│   │       ├── nfc-issuer.tsx          # Admin NFC tag writer
│   │       └── actions.ts              # verifyProfileForNfc, markNfcIssuedAction
│   ├── (developer)/                    # Developer (Platform Admin) Route Group
│   │   ├── layout.tsx                  # Dark platform admin layout + role guard (developer only)
│   │   └── developer/
│   │       └── dashboard/              # → URL: /developer/dashboard
│   │           ├── page.tsx            # Platform stats + organizer inventory table
│   │           ├── actions.ts          # allocateTagsAction (role-gated)
│   │           └── allocation-modal.tsx # Client modal to ship a tag roll to an organizer
│   ├── api/
│   │   └── checkin/
│   │       └── sync/
│   │           └── route.ts            # Bulk offline sync handler (checkins + nfc issuances)
│   └── proxy.ts                        # Root Auth & Role-based Access Proxy (Next.js 16)
├── drizzle/
│   └── schema.ts                       # Drizzle ORM PostgreSQL schema
├── lib/
│   ├── idb.ts                          # IndexedDB wrapper (attendees cache & sync queue)
│   ├── offline-checkin.ts              # Optimistic local check-in & handover verification
│   └── sync.ts                         # Queue flusher & background reconciliation
└── utils/
    ├── db.ts                           # Drizzle DB connection instance
    └── supabase/                       # Supabase client helpers (client, server, middleware)
```

---

## 5. Roles & Access Control

| Role        | Home Route             | Access                                         |
| :---------- | :--------------------- | :--------------------------------------------- |
| `student`   | `/my-id`               | `/events`, `/tickets`, `/my-id`                |
| `organizer` | `/dashboard`           | `/dashboard`, `/events/new`, `/scan`, `/admin` |
| `developer` | `/developer/dashboard` | `/developer/*` only                            |

- `proxy.ts` enforces role boundaries; any wrong-role access redirects to that role's home.
- `(developer)/layout.tsx` performs a server-side role check and redirects non-developers to `/login`.
- `allocateTagsAction` additionally verifies `role === 'developer'` before writing to `nfc_allocations`.

---

## 6. Core Workflows & User Lifecycles

### A. Student Pass & Decoupled NFC Lifecycle

```mermaid
stateDiagram-v2
    [*] --> State1_NotPurchased: Profile Created
    State1_NotPurchased --> State2_AwaitingPickup: Student completes Checkout (3,000 MMK)
    State2_AwaitingPickup --> State3_ActiveLinked: Organizer links blank tag at door/admin
    State3_ActiveLinked --> State1_NotPurchased: Student clicks "Report Lost Tag" (Revokes UUID)
    State3_ActiveLinked --> State3_ActiveLinked: Student taps at campus events
```

1. **State 1 (Not Purchased)**:
   - Student uses standard digital QR code for event check-in.
   - Prompted to purchase an optional physical NFC Pass for 3,000 MMK (KBZPay / WavePay).
2. **State 2 (Awaiting Pickup)**:
   - `purchasedNfc: true`, `nfcIssued: false`.
   - Amber badge in `/my-id`. Student shows QR code to any organizer or door attendant.
3. **State 3 (Active & Linked)**:
   - `purchasedNfc: true`, `nfcIssued: true`.
   - Emerald badge. Student can tap into any event without unlocking their phone.
4. **Decoupled Lost Tag Reporting**:
   - If tag is lost, student taps **"Report Lost Tag"** in `/my-id`.
   - System immediately rotates `profiles.checkInToken` with a new UUID and resets `purchasedNfc: false, nfcIssued: false`.
   - The lost tag is instantly rendered useless. The student can purchase a replacement tag whenever ready.

---

### B. Organizer Door Check-In & Fast Walk-Up Handover

When an attendee arrives at an event:

1. **Scan / Tap**: Organizer points camera at attendee QR or taps attendee NFC tag.
2. **Lookup**:
   - **Online**: Calls `checkInAction(token, eventId)`.
   - **Offline**: Queries IndexedDB via `offlineCheckIn(token)`.
3. **Validation**:
   - If attendee not registered → returns `not_found`.
   - If attendee already checked in → returns `already_scanned`.
   - If attendee registered and valid → marks `is_checked_in = true`, records timestamp.
4. **Fast NFC Handover Modal**:
   - If the student has `purchasedNfc === true && nfcIssued === false`, the scanner triggers a modal:
     > _"Attendee purchased an NFC tag. Tap a blank tag now to link and hand over."_
   - Organizer taps a blank tag to write the student's `checkInToken` UUID.
   - Local DB updates immediately (`markNfcIssuedLocally`) to avoid duplicate prompts during offline scans.
   - Transactional ledger entry logged to `nfc_issuances`.

---

### C. Developer NFC Inventory Management

```mermaid
sequenceDiagram
    participant Dev as Developer (/developer/dashboard)
    participant DB as Postgres (nfc_allocations)
    participant Org as Organizer (/dashboard)

    Dev->>DB: allocateTagsAction(organizerId, amount, notes)
    DB-->>Dev: Insert nfc_allocations row
    Note over Org: Stock banner = SUM(allocations) - COUNT(issuances)
    Org->>DB: Query nfc_allocations + nfc_issuances
    DB-->>Org: blankTagsRemaining
    Note over Org: Green if healthy, Amber if ≤20, Red if ≤0
```

- Platform developer logs into `/developer/dashboard` to view all organizers' stock levels.
- Clicking **+ Allocate Tags** on any organizer row opens a modal to record a new shipment.
- `allocateTagsAction` is double-gated: Supabase session check + DB role verification.
- The organizer's `/dashboard` shows a dynamic stock banner only once they have received at least one allocation.

---

### D. Offline Synchronization Engine

```mermaid
sequenceDiagram
    participant S as Scanner (Client)
    participant IDB as IndexedDB Cache
    participant API as /api/checkin/sync
    participant DB as Postgres Database

    Note over S,IDB: Organizer downloads guest list before event
    S->>API: loadGuestListAction(eventId)
    API-->>S: Attendee records
    S->>IDB: saveGuestList(attendees)

    Note over S,IDB: Network disconnects (Offline Mode)
    S->>IDB: offlineCheckIn(token)
    IDB-->>S: Success (Mark checked in locally)
    S->>IDB: addToSyncQueue({ ticket_id, type: "checkin", scanned_at })

    Note over S,IDB: Tag handover occurs offline
    S->>IDB: markNfcIssuedLocally(token)
    S->>IDB: addToSyncQueue({ ticket_id: "issue_...", type: "issue_nfc", token, event_id })

    Note over S,DB: Network reconnects
    S->>API: POST /api/checkin/sync (pending queue)
    API->>DB: Bulk update tickets (is_checked_in = true)
    API->>DB: Transactional update profiles & insert nfc_issuances
    API-->>S: { results: [{ ticket_id, success: true }] }
    S->>IDB: markSyncCompleted(ticket_id)
```

---

## 7. Security, RLS & Access Control Rules

1. **Next.js 16 `proxy.ts`**:
   - Auth enforcement: Unauthenticated users are redirected to `/login`.
   - Role boundaries: Students accessing organizer routes are redirected to `/events`; organizers are routed to `/dashboard`; developers to `/developer/dashboard`.
2. **Database Row Level Security (RLS)**:
   - RLS is enabled on all tables in public schema.
   - Ownership predicates use `TO authenticated` with `USING (auth.uid() = user_id)` (never bypassing via `SECURITY DEFINER`).
3. **Idempotent Handover Transactions**:
   - `markNfcIssuedAction` runs inside `db.transaction()` and verifies `nfcIssued === false` before writing to prevent duplicate ledger entries.
4. **Token Isolation**:
   - Physical NFC tags contain **only** the raw UUID string (`checkInToken`). No sensitive personal details, names, or emails are stored on the physical tag.
5. **Developer Action Guard**:
   - `allocateTagsAction` performs both a Supabase session check and a DB-level role assertion before inserting into `nfc_allocations`. Never trusted from the client alone.

---

## 8. Development & Verification Guide

### Prerequisites

- Node.js 20+
- pnpm package manager

### Environment Configuration (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL="postgresql://postgres.<tenant>:<password>@<pooler-host>:6543/postgres"
```

### Essential CLI Commands

```bash
# Start local development server
pnpm dev

# Run Vitest automated test suite
pnpm test

# Run TypeScript type safety verification
pnpm exec tsc --noEmit

# Generate Drizzle migration files
pnpm drizzle-kit generate

# Run database migrations
pnpm drizzle-kit migrate
```
