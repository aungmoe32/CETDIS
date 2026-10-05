# CEDIS — Campus Event Ticketing and Digital Identification System

CEDIS (Campus Event and Digital Identification System) is a high-throughput Progressive Web Application designed for campus event ticketing, door check-in, offline sync, physical Universal NFC pass management, and walk-up sales with cash reconciliation.

Built on Next.js 16 (App Router), React 19, Supabase Auth, PostgreSQL via Drizzle ORM, Serwist, and Tailwind CSS v4.

---

## Key Features

### 1. Student Experience

- **Digital ID Pass**: Instant QR code pass (`/my-id`) backed by a universal `check_in_token` UUID tied to the student profile.
- **Universal NFC Tag Support**: Support for physical NFC wristbands and cards. One tag works across all campus events the student registers for.
- **Lost Pass Revocation**: Immediate regeneration of `check_in_token` to revoke lost physical NFC tags without affecting registered tickets or account history.
- **Event Discovery & RSVP**: Browse campus schedules, register for free or paid events, and track active tickets (`/events`, `/my-tickets`).
- **Account Management**: Clean profile view (`/my-profile`) to update public student display name and inspect credentials with masked email security.

### 2. Organizer Operations

- **Live Entrance Dashboard**: Streamlined dashboard (`/dashboard`) focused on real-time event operations, capacity tracking, crowd check-in rates, and quick door actions.
- **Door Check-In Scanner**: High-speed scanner (`/scan?event=<event_id>`) supporting both camera QR scanning (`html5-qrcode`) and physical Web NFC tapping (`NDEFReader`).
- **Offline-First Synchronization**: Downloads guest lists to client-side IndexedDB (`idb`). Processes check-ins locally in sub-10ms without network dependence, queuing transitions and syncing to Supabase when connectivity returns.
- **Walk-Up Sales & Door Reconciliation**: Quick door ticketing workflow for registered attendees who forgot to RSVP as well as anonymous guests, including offline campus directory caching, local cash collection logging, background sync-back, and door reconciliation.
- **Schedule & Event Management**: Full event lifecycle management (`/events/all`, `/events/new`, `/events/[id]/edit`) with status filters, price options, attendee capacity enforcement, and CSV guest list exports.
- **Organizer Profile**: Dedicated profile page (`/profile`) with top navigation account menu, editable display name, and masked credential view.

### 3. Platform Developer & Administration

- **Hardware Supply Chain Ledger**: Administrative dashboard (`/developer/dashboard`) tracking physical NFC tag rolls allocated to campus organizers.
- **Door Issuance Monitoring**: Real-time visibility into tag distribution, remaining organizer stock, and over-issuance alerts.
- **Stock Replenishment**: Direct tag allocation modal to record roll deliveries and batch numbers into the ledger.
- **Masked Privacy Controls**: Organizer emails are masked by default (`a*****@domain.com`) with one-click eye toggle visibility.
- **Developer Profile**: Administrative profile settings (`/developer/profile`) with account management and credential review.

---

## Technology Stack

| Layer                 | Technology                 | Description                                                                                                                     |
| :-------------------- | :------------------------- | :------------------------------------------------------------------------------------------------------------------------------ |
| **Framework**         | Next.js 16 (App Router)    | React Server Components, Server Actions co-located in `actions.ts`, and root `proxy.ts`.                                        |
| **Runtime / UI**      | React 19 + TypeScript      | Strict typing across components, server actions, and database queries.                                                          |
| **Styling**           | Tailwind CSS v4            | Clean white aesthetic, custom typography (`font-dingos-bold`, `font-bebas`), and tactile interactive components.                |
| **Database**          | PostgreSQL via Drizzle ORM | Fully typed schema, migrations, and queries using `drizzle-orm`. Direct Supabase client queries are reserved strictly for auth. |
| **Authentication**    | Supabase Auth              | Passwordless Email OTP authentication (`supabase.auth.signInWithOtp`).                                                          |
| **Offline Storage**   | IndexedDB (`idb`)          | Browser storage caching event rosters, check-in statuses, and outgoing offline sync queues.                                     |
| **Service Worker**    | Serwist                    | Progressive Web App service worker for asset caching and background synchronization.                                            |
| **Hardware Scanning** | `html5-qrcode` & Web NFC   | Camera QR scanning with cleanup safeguards and native Web NFC reader/writer support.                                            |
| **Testing**           | Vitest                     | Unit and integration test suite with mocked database and session layers.                                                        |

---

## Architectural Principles

### 1. Universal Identity Model

Check-in tokens are decoupled from individual event tickets. Instead, the check-in token is a permanent UUID on the student profile (`profiles.checkInToken`). An organizer scanning a student's QR code or NFC tag retrieves this token, finds matching event tickets, and marks attendance. If a student replaces or revokes their NFC tag, only `profiles.checkInToken` is rotated; all event tickets remain valid.

### 2. Offline-First Check-In Pipeline

1. **Roster Caching**: When an organizer opens `/scan?event=<event_id>`, the current ticket roster is loaded from PostgreSQL into IndexedDB.
2. **Local Verification**: Scanning a QR code or tapping an NFC tag executes verification entirely inside the browser. Duplicate check-ins are blocked instantly.
3. **Queue & Background Sync**: Check-in records are saved locally and queued in an IndexedDB sync table. Serwist and navigator online listeners flush pending mutations to the server in batches.
4. **Conflict Resolution**: Server mutations use atomic updates on `tickets.isCheckedIn` with timestamp comparison to prevent double-entry conflicts.

### 3. Supply Chain & Audit Ledgers

- `nfc_allocations`: Mutable allocation ledger tracking blank physical NFC tags shipped by platform developers to organizers.
- `nfc_issuances`: Immutable audit log recording every instance an organizer writes a student's check-in token to a physical tag at an event.

---

## Database Schema

```
profiles
├── id (UUID, PK) -> mirrors auth.users.id
├── email (TEXT, Unique)
├── full_name (TEXT)
├── role (ENUM: 'student' | 'organizer' | 'developer')
├── check_in_token (UUID, Unique)
├── purchased_nfc (BOOLEAN)
├── nfc_issued (BOOLEAN)
└── created_at (TIMESTAMP WITH TIME ZONE)

events
├── id (UUID, PK)
├── title (TEXT)
├── description (TEXT)
├── date_time (TIMESTAMP WITH TIME ZONE)
├── location (TEXT)
├── max_capacity (INTEGER)
├── price (INTEGER)
├── organizer_id (UUID, FK -> profiles.id)
└── created_at (TIMESTAMP WITH TIME ZONE)

tickets
├── id (UUID, PK)
├── user_id (UUID, FK -> profiles.id)
├── event_id (UUID, FK -> events.id)
├── is_checked_in (BOOLEAN)
├── scanned_at (TIMESTAMP WITH TIME ZONE)
├── purchase_method (TEXT: 'online' | 'cash_at_door')
└── UNIQUE(user_id, event_id)

nfc_issuances
├── id (UUID, PK)
├── user_id (UUID, FK -> profiles.id)
├── issued_by (UUID, FK -> profiles.id)
├── event_id (UUID, FK -> events.id)
└── issued_at (TIMESTAMP WITH TIME ZONE)

nfc_allocations
├── id (UUID, PK)
├── organizer_id (UUID, FK -> profiles.id)
├── amount (INTEGER)
├── notes (TEXT, Optional)
└── allocated_at (TIMESTAMP WITH TIME ZONE)
```

---

## Route Structure & Access Control

Routing is organized into route groups with role-based layout validation and session verification in `proxy.ts`.

| Route Group        | Purpose                                                                           | Access Rule                                                  |
| :----------------- | :-------------------------------------------------------------------------------- | :----------------------------------------------------------- |
| `app/(auth)/`      | Authentication pages (`/login`)                                                   | Unauthenticated only; logged-in users redirect to role home. |
| `app/(student)/`   | Student passes & events (`/my-id`, `/events`, `/my-tickets`, `/my-profile`)       | Authenticated `student` role.                                |
| `app/(organizer)/` | Live dashboard, scanner & events (`/dashboard`, `/scan`, `/events/*`, `/profile`) | Authenticated `organizer` role.                              |
| `app/(developer)/` | Hardware inventory & admin (`/developer/dashboard`, `/developer/profile`)         | Authenticated `developer` role.                              |

### Access Rules

- Root route (`/`) dynamically inspects the user role and routes:
  - Unauthenticated -> `/login`
  - Student -> `/my-id`
  - Organizer -> `/dashboard`
  - Developer -> `/developer/dashboard`
- Accessing cross-role routes triggers automatic redirects to the user's appropriate section.

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (recommended) or npm
- Supabase Project (with Auth and PostgreSQL enabled)

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd CEDIS
pnpm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Database Connection (Direct connection string for Drizzle ORM)
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
```

### 3. Run Database Migrations

Push schema definitions to your Supabase PostgreSQL database:

```bash
pnpm drizzle-kit push
```

### 4. Seed Development Data (Optional)

Run the built-in seed scripts to populate sample events, tickets, and NFC balances:

```bash
# Seed demo campus events
pnpm db:seed-events

# Reset ticket records
pnpm db:reset-tickets

# Reset NFC inventory and allocation records
pnpm db:reset-nfc
```

### 5. Start Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Scripts Reference

| Command                 | Description                                       |
| :---------------------- | :------------------------------------------------ |
| `pnpm dev`              | Starts Next.js development server with Turbopack. |
| `pnpm build`            | Compiles application for production deployment.   |
| `pnpm start`            | Runs the compiled production server.              |
| `pnpm lint`             | Executes ESLint analysis across the repository.   |
| `pnpm test`             | Runs the Vitest test suite once.                  |
| `pnpm test:watch`       | Runs Vitest in interactive watch mode.            |
| `pnpm db:seed-events`   | Inserts sample events into the database.          |
| `pnpm db:reset-events`  | Clears and resets event tables.                   |
| `pnpm db:reset-tickets` | Resets all ticket records and check-in statuses.  |
| `pnpm db:reset-nfc`     | Resets NFC allocation and issuance tables.        |

---

## Testing

The project uses Vitest with mocked database clients and Supabase auth sessions:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

Test coverage includes:

- Role-based route guard and session proxying (`proxy.test.ts`)
- Offline sync queue flushing and failure recovery (`sync.test.ts`)
- Organizer profile and student profile actions (`profile.test.ts`, `student-profile.test.ts`)
- Developer profile and dashboard masking logic (`developer-profile.test.ts`)
- Live door scanner and offline check-in handling (`offline-checkin.test.ts`)
- Walk-up ticket sales and cash reconciliation (`walkup-sales.test.ts`)
- NFC allocation arithmetic and issuance tracking (`nfc.test.ts`)
- Rich text sanitization and rendering (`rich-text.test.ts`)

---

## Code Conventions

- **Server Actions**: Co-located in `actions.ts` alongside the route or component using them.
- **Shared Utilities**: Pure business logic with zero framework dependencies placed in `lib/`.
- **Database Access**: All data queries and mutations must use Drizzle ORM (`db`). The Supabase client is reserved strictly for authentication session handling.
- **Row Level Security**: Enabled on all public schema tables in PostgreSQL.
- **Styling**: Tailwind CSS v4 utility classes. No heavy external component libraries.
