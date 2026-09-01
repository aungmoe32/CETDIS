import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Error: DATABASE_URL is not set.");
  console.error("Run with: node --env-file=.env.local scripts/reset-tickets.mjs <target> [options]");
  process.exit(1);
}

const sql = postgres(connectionString, { prepare: false, ssl: { rejectUnauthorized: false } });

async function main() {
  const args = process.argv.slice(2);

  const isDelete = args.includes("--delete") || args.includes("--remove");
  const isAll = args.includes("--all");
  const eventFlagIndex = args.findIndex((a) => a === "--event" || a === "-e");
  const eventIdFilter = eventFlagIndex !== -1 ? args[eventFlagIndex + 1] : null;

  // Find target if not --all and not flags
  const targetArg = args.find((a) => !a.startsWith("-") && a !== eventIdFilter);

  if ((!targetArg && !isAll) || args.includes("--help") || args.includes("-h")) {
    console.log(`
CETDIS Ticket Reset & Management Devtool
================================================================================
Usage:
  # 1. Reset check-in state to FALSE (keep tickets registered):
  node --env-file=.env.local scripts/reset-tickets.mjs <email | userId>
  node --env-file=.env.local scripts/reset-tickets.mjs <email | userId> --event <eventId>
  node --env-file=.env.local scripts/reset-tickets.mjs --all

  # 2. Completely DELETE / REMOVE tickets:
  node --env-file=.env.local scripts/reset-tickets.mjs <email | userId> --delete
  node --env-file=.env.local scripts/reset-tickets.mjs <email | userId> --delete --event <eventId>
  node --env-file=.env.local scripts/reset-tickets.mjs --all --delete
  node --env-file=.env.local scripts/reset-tickets.mjs --all --delete --event <eventId>

Options:
  <email | userId>   Target a specific attendee by their profile email or UUID
  --all              Apply action to ALL tickets across the database
  --delete, --remove Completely delete the ticket row(s) from the database
  --event, -e <id>   Scope the action to a specific event ID
================================================================================
`);

    console.log("Current registered tickets overview (Recent 25):\n");
    const sampleTickets = await sql`
      SELECT 
        t.id as ticket_id,
        p.full_name as attendee,
        p.email,
        e.title as event_title,
        t.is_checked_in,
        t.scanned_at,
        t.purchase_method
      FROM tickets t
      JOIN profiles p ON t.user_id = p.id
      JOIN events e ON t.event_id = e.id
      ORDER BY t.is_checked_in DESC, t.scanned_at DESC NULLS LAST
      LIMIT 25
    `;

    const [stats] = await sql`
      SELECT 
        count(*)::int as total_tickets,
        count(*) filter (where is_checked_in = true)::int as checked_in_count,
        count(*) filter (where purchase_method = 'cash_at_door')::int as walkup_count
      FROM tickets
    `;

    console.log(`Summary: ${stats.total_tickets} Total Tickets | ${stats.checked_in_count} Checked In | ${stats.walkup_count} Walk-Up Sales\n`);

    if (sampleTickets.length === 0) {
      console.log("No tickets currently exist in database.\n");
    } else {
      console.table(
        sampleTickets.map((t) => ({
          "Ticket ID": t.ticket_id.slice(0, 8) + "...",
          Attendee: t.attendee,
          Email: t.email,
          Event: t.event_title,
          "Checked In": t.is_checked_in,
          "Scanned At": t.scanned_at ? new Date(t.scanned_at).toLocaleTimeString() : "-",
          Method: t.purchase_method,
        }))
      );
    }
    await sql.end();
    return;
  }

  // ── 1. ALL TICKETS MODE ──────────────────────────────────────────────────
  if (isAll) {
    if (isDelete) {
      console.log(
        eventIdFilter
          ? `Deleting ALL tickets for event "${eventIdFilter}"...`
          : "Deleting ALL tickets across the entire database..."
      );

      const deleted = eventIdFilter
        ? await sql`DELETE FROM tickets WHERE event_id = ${eventIdFilter} RETURNING id`
        : await sql`DELETE FROM tickets RETURNING id`;

      console.log(`Successfully deleted ${deleted.length} ticket(s).`);
    } else {
      console.log(
        eventIdFilter
          ? `Resetting check-in status (is_checked_in = false) for event "${eventIdFilter}"...`
          : "Resetting check-in status (is_checked_in = false) for ALL tickets..."
      );

      const updated = eventIdFilter
        ? await sql`
            UPDATE tickets
            SET is_checked_in = false, scanned_at = NULL
            WHERE event_id = ${eventIdFilter} AND is_checked_in = true
            RETURNING id
          `
        : await sql`
            UPDATE tickets
            SET is_checked_in = false, scanned_at = NULL
            WHERE is_checked_in = true
            RETURNING id
          `;

      console.log(`Successfully reset ${updated.length} ticket(s) to is_checked_in = false.`);
    }

    console.log("\nOperation completed successfully.");
    await sql.end();
    return;
  }

  // ── 2. SINGLE USER MODE ──────────────────────────────────────────────────
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetArg);

  const [profile] = isUuid
    ? await sql`SELECT id, email, full_name, role FROM profiles WHERE id = ${targetArg}`
    : await sql`SELECT id, email, full_name, role FROM profiles WHERE email = ${targetArg} LIMIT 1`;

  if (!profile) {
    console.error(`User not found with ${isUuid ? "ID" : "email"}: "${targetArg}"`);
    await sql.end();
    process.exit(1);
  }

  console.log(`Target Attendee: ${profile.full_name} (${profile.email}) [ID: ${profile.id}]`);

  if (isDelete) {
    console.log(
      eventIdFilter
        ? `Deleting ticket(s) for event "${eventIdFilter}"...`
        : `Deleting ALL tickets registered under ${profile.full_name}...`
    );

    const deleted = eventIdFilter
      ? await sql`
          DELETE FROM tickets
          WHERE user_id = ${profile.id} AND event_id = ${eventIdFilter}
          RETURNING id
        `
      : await sql`
          DELETE FROM tickets
          WHERE user_id = ${profile.id}
          RETURNING id
        `;

    console.log(`Successfully deleted ${deleted.length} ticket(s) for ${profile.full_name}.`);
  } else {
    console.log(
      eventIdFilter
        ? `Resetting check-in status for event "${eventIdFilter}"...`
        : `Resetting check-in status (is_checked_in = false) for all tickets of ${profile.full_name}...`
    );

    const updated = eventIdFilter
      ? await sql`
          UPDATE tickets
          SET is_checked_in = false, scanned_at = NULL
          WHERE user_id = ${profile.id} AND event_id = ${eventIdFilter}
          RETURNING id, event_id
        `
      : await sql`
          UPDATE tickets
          SET is_checked_in = false, scanned_at = NULL
          WHERE user_id = ${profile.id}
          RETURNING id, event_id
        `;

    console.log(`Successfully reset ${updated.length} ticket(s) to is_checked_in = false.`);
  }

  console.log("\nOperation completed successfully.");
  await sql.end();
}

main().catch(async (err) => {
  console.error("Script error:", err);
  await sql.end();
  process.exit(1);
});
