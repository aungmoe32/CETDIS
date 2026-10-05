import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ Error: DATABASE_URL is not set.");
  console.error(
    "Run with: node --env-file=.env.local scripts/reset-events.mjs [options]",
  );
  process.exit(1);
}

const sql = postgres(connectionString, {
  prepare: false,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const args = process.argv.slice(2);
  const ticketsOnly = args.includes("--tickets-only") || args.includes("-t");
  const force = args.includes("--force") || args.includes("-f");
  const organizerIdx = args.findIndex((a) => a === "--organizer" || a === "-o");
  const organizerTarget = organizerIdx !== -1 ? args[organizerIdx + 1] : null;

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
CEDIS Event & Ticket Reset Devtool
================================================================================
Usage:
  # 1. Remove all events and all tickets across the entire database:
  pnpm db:reset-events
  node --env-file=.env.local scripts/reset-events.mjs

  # 2. Remove only tickets (keep event definitions intact):
  pnpm db:reset-events --tickets-only
  node --env-file=.env.local scripts/reset-events.mjs --tickets-only

  # 3. Remove events & tickets owned by a specific organizer:
  node --env-file=.env.local scripts/reset-events.mjs --organizer organizer@example.com

Options:
  --tickets-only, -t     Only remove tickets, leave events in database
  --organizer, -o <id>   Scope event deletion to a specific organizer email or UUID
  --force, -f            Run immediately without interactive prompt
================================================================================
`);
    await sql.end();
    process.exit(0);
  }

  console.log("🧹 [CEDIS Reset Devtool] Scanning current database state...\n");

  let organizerId = null;
  if (organizerTarget) {
    const [org] = await sql`
      SELECT id, email, full_name FROM profiles 
      WHERE id::text = ${organizerTarget} OR LOWER(email) = ${organizerTarget.toLowerCase()}
      LIMIT 1
    `;
    if (!org) {
      console.error(`❌ Organizer not found for target: "${organizerTarget}"`);
      await sql.end();
      process.exit(1);
    }
    organizerId = org.id;
    console.log(
      `Targeting organizer: ${org.full_name || "Organizer"} (${org.email}) [ID: ${org.id}]`,
    );
  }

  // Count current records
  const [ticketCount] = organizerId
    ? await sql`
        SELECT count(*)::int as count FROM tickets t 
        JOIN events e ON t.event_id = e.id 
        WHERE e.organizer_id = ${organizerId}
      `
    : await sql`SELECT count(*)::int as count FROM tickets`;

  const [eventCount] = organizerId
    ? await sql`SELECT count(*)::int as count FROM events WHERE organizer_id = ${organizerId}`
    : await sql`SELECT count(*)::int as count FROM events`;

  console.log(`Current records to remove:`);
  console.log(`  • Tickets: ${ticketCount.count}`);
  if (!ticketsOnly) {
    console.log(`  • Events:  ${eventCount.count}`);
  }
  console.log("");

  if (ticketCount.count === 0 && (ticketsOnly || eventCount.count === 0)) {
    console.log("✨ Database is already empty. Nothing to remove.");
    await sql.end();
    process.exit(0);
  }

  // Perform deletion inside a transaction
  await sql.begin(async (tx) => {
    if (ticketsOnly) {
      if (organizerId) {
        await tx`
          DELETE FROM tickets 
          WHERE event_id IN (SELECT id FROM events WHERE organizer_id = ${organizerId})
        `;
      } else {
        await tx`DELETE FROM tickets`;
      }
      console.log(`✅ Successfully deleted ${ticketCount.count} tickets.`);
    } else {
      // Deleting events will also cascade delete tickets
      if (organizerId) {
        await tx`DELETE FROM tickets WHERE event_id IN (SELECT id FROM events WHERE organizer_id = ${organizerId})`;
        await tx`DELETE FROM events WHERE organizer_id = ${organizerId}`;
      } else {
        await tx`DELETE FROM tickets`;
        await tx`DELETE FROM events`;
      }
      console.log(
        `✅ Successfully deleted ${ticketCount.count} tickets and ${eventCount.count} events.`,
      );
    }
  });

  console.log("\n🎉 Database clean completed successfully.\n");
  await sql.end();
}

main().catch(async (err) => {
  console.error("\n❌ Error during reset:", err.message || err);
  await sql.end();
  process.exit(1);
});
