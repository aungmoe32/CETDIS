Here is the core database structure and the exact data flow for your project. I have kept this strictly to the core features (Email OTP, Role-Based Access, QR/NFC Check-In, and Revocable Tokens) so your database remains clean and highly efficient.

### 1. Core Database Structure (Relational Schema)

You will only need 3 core tables to make this entire system work.

**Table 1: Users**
This table handles authentication, roles, and the permanent Digital ID.

- **id** (UUID, Primary Key) - Auto-generated unique identifier.
- **email** (String, Unique) - Used for the OTP login.
- **full_name** (String) - Displayed on the organizer's scanner screen.
- **role** (Enum) - Either `student` or `organizer`. (Defaults to `student`).
- **check_in_token** (String, Unique) - The dynamic code actually written to the QR/NFC tag (e.g., `tkt-abc-123`).
- **created_at** (Timestamp)

**Table 2: Events**
This table stores the details of the campus events.

- **id** (UUID, Primary Key)
- **title** (String) - e.g., "Spring IT Hackathon"
- **date_time** (Timestamp) - When the event happens.
- **location** (String) - e.g., "Main Hall"
- **max_capacity** (Integer) - Maximum tickets allowed.
- **organizer_id** (UUID, Foreign Key -> Users.id) - Which admin created it.
- **created_at** (Timestamp)

**Table 3: Tickets (The Bridge Table)**
This table connects a Student to an Event. It tracks if they are allowed in and if they have been scanned.

- **id** (UUID, Primary Key)
- **user_id** (UUID, Foreign Key -> Users.id) - The student who claimed the ticket.
- **event_id** (UUID, Foreign Key -> Events.id) - The event they are attending.
- **is_checked_in** (Boolean) - Defaults to `False`.
- **scanned_at** (Timestamp, Nullable) - Records the exact second they walked through the door.
- _Constraint:_ Ensure a user can only have ONE ticket per event (Unique constraint on `user_id` + `event_id`).

---

### 2. The Core Data Flow (Step-by-Step)

Here is exactly how data moves through these 3 tables in real-time during your app's lifecycle.

#### Flow 1: Authentication & Digital ID Generation

1. Student enters their email on your Next.js frontend.
2. Supabase sends a 6-digit OTP. Student enters the OTP.
3. **Database Action:**
   - Does this email exist in the `Users` table?
   - If No: Create a new row. Generate a random `check_in_token` (e.g., `token-999`). Set role to `student`.
4. Student logs in and goes to "My Digital ID".
5. The frontend reads `token-999` from the database and generates a QR code of the URL: `yourwebsite.com/scan/token-999`.

#### Flow 2: RSVP (Claiming a Ticket)

1. Organizer creates an Event. (Creates a row in the `Events` table).
2. Student views the Event and clicks "RSVP".
3. **Database Action:**
   - Backend counts how many rows in the `Tickets` table have this `event_id`.
   - Is count less than `max_capacity`?
   - If Yes: Create a new row in the `Tickets` table linking this `user_id` to this `event_id`. `is_checked_in` is set to `False`.

#### Flow 3: The Check-In Process (At the Door)

1. Organizer opens the Scanner page (they must be logged in, and backend verifies their role is `organizer`).
2. Student shows their QR code or taps their NFC keychain.
3. The Organizer's phone reads the URL and extracts `token-999`.
4. **Database Action (The Check-In Logic):**
   - _Query 1:_ Search the `Users` table for `check_in_token == 'token-999'`. (Result: Found John Doe, `user_id: 123`).
   - _Query 2:_ Search the `Tickets` table for `user_id == 123` AND `event_id == [Today's Event]`.
   - _Condition A:_ If no ticket is found -> Return "Error: No Ticket".
   - _Condition B:_ If ticket is found but `is_checked_in == True` -> Return "Error: Already Scanned".
   - _Condition C:_ If ticket is found and `is_checked_in == False` -> Update row to `is_checked_in = True` and set `scanned_at = NOW()`.
5. Frontend flashes a Green Success Screen with John Doe's `full_name`.

#### Flow 4: Revoking a Lost Tag (Security Failsafe)

1. Student reports they lost their physical NFC tag.
2. Organizer searches the student's name in the Admin Dashboard and clicks "Revoke Tag".
3. **Database Action:**
   - Go to `Users` table for John Doe.
   - Delete the old `check_in_token` (`token-999`).
   - Generate a brand new `check_in_token` (`token-555`) and save it.
4. If a thief tries to scan the lost NFC tag (`token-999`), Query 1 in the Check-In process will fail to find a user, rendering the lost tag completely useless.
5. The Student's digital QR code on their phone will instantly update to show `token-555`.

### Why this structure is perfect:

It uses strict relational database principles. The `check_in_token` acts as a highly secure, replaceable "password" for the student's physical identity, while the `user_id` keeps their actual ticket history safe and permanent.

---

To make your system work in **Offline Mode**, you have to introduce a second, temporary database that lives entirely inside the Organizer's web browser. This is called **IndexedDB**.

Because you cannot query the cloud (Supabase) without the internet, the app must temporarily download the required data, process check-ins locally, and then sync them back to the cloud later.

Here is the exact local database structure and the data flow for Offline Mode.

### 1. Offline Database Structure (Local IndexedDB)

You do not need to download your entire database to the phone. You only need a flattened, simplified list of students who have tickets for _today's specific event_.

**Local Table 1: Cached_Tickets**
This is the "Guest List." It holds exactly what the scanner needs to verify a person instantly.

- **ticket_id** (UUID)
- **check_in_token** (String) - e.g., `token-999` (used for the fast lookup).
- **full_name** (String) - To display on the green success screen.
- **is_checked_in** (Boolean) - Starts as whatever the cloud database says it is.

**Local Table 2: Sync_Queue**
This table acts as a "Waiting Room." It records every scan that happens while the internet is down, so the app remembers to send them to the server later.

- **ticket_id** (UUID) - Which ticket was scanned.
- **scanned_at** (Timestamp) - The exact second the offline scan happened.
- **sync_status** (Enum) - `pending` or `completed`.

---

### 2. The Offline Data Flow (Step-by-Step)

Here is how the data moves between the Cloud (Supabase) and the Browser (IndexedDB) during an internet outage.

#### Flow 1: The Pre-Event Download (Online)

_This happens 30 minutes before the event starts while the Organizer still has good Wi-Fi._

1. The Organizer opens the Scanner page and clicks a button: **"Enable Offline Mode"**.
2. **Data Action:** The Next.js frontend queries Supabase: _"Give me every Ticket linked to today's Event, joined with the User's name and Check-in Token."_
3. The backend sends this list to the Organizer's phone.
4. The browser saves this list into the **Cached_Tickets** local table.

#### Flow 2: Scanning at the Door (Offline)

_The Wi-Fi crashes. The Organizer's phone has 0 bars of signal. The Organizer switches to the QR camera scanner._

1. Student shows their QR code. The camera reads: `token-999`.
2. **Local Data Action (The Offline Logic):**
   - _Query:_ Search the local **Cached_Tickets** table for `token-999`.
   - _Condition A:_ If no token is found -> Return "Error: Not on Guest List".
   - _Condition B:_ If token is found but `is_checked_in == True` -> Return "Error: Already Scanned".
   - _Condition C:_ If token is found and `is_checked_in == False`:
     1. Update local **Cached_Tickets**: `is_checked_in = True`.
     2. Create a new row in local **Sync_Queue**: `ticket_id: 123`, `scanned_at: 10:46 PM`, `status: pending`.
3. Frontend flashes a Green Success Screen. (The student walks in, and the line keeps moving without any lag!)

#### Flow 3: The Background Sync (Internet Restored)

_15 minutes later, the Wi-Fi comes back online. The browser's Service Worker instantly detects the connection._

1. The browser checks the local **Sync_Queue** table. It sees 45 pending offline scans.
2. **Data Action:** The frontend bundles these 45 records into a JSON array and sends a bulk `POST` request to your Next.js API.
3. **Cloud Action:** The Next.js backend loops through the array and updates the master Supabase `Tickets` table, setting `is_checked_in = True` and recording the exact offline timestamps.
4. The backend sends a "Success" message back to the phone.
5. The browser deletes those 45 rows from the local **Sync_Queue**. Everything is now perfectly synchronized!

---

Also

- Simple clean white theme
- write unit tests for core backend logics

Currently installed

- serwist
- drizzle
