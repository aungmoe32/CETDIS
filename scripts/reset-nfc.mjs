import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Error: DATABASE_URL is not set.");
  console.error(
    "Run with: node --env-file=.env.local scripts/reset-nfc.mjs <email | userId | --all>",
  );
  process.exit(1);
}

const sql = postgres(connectionString, {
  prepare: false,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const args = process.argv.slice(2);
  const target = args[0];

  if (!target || target === "--help" || target === "-h") {
    console.log(`
CEDIS NFC Reset Tool
---------------------------------------------
Usage:
  node --env-file=.env.local scripts/reset-nfc.mjs <email | userId>
  node --env-file=.env.local scripts/reset-nfc.mjs --all
  node --env-file=.env.local scripts/reset-nfc.mjs --all --include-allocations

Options:
  <email | userId>       Reset NFC status and delete issuances for a single user
  --all                  Reset NFC status and delete all issuances for ALL users
  --include-allocations  Also delete all developer-to-organizer stock allocations (when using --all)
---------------------------------------------
`);

    console.log("Current profiles with active NFC data:\n");
    const activeProfiles = await sql`
      SELECT id, email, full_name, role, purchased_nfc, nfc_issued, check_in_token
      FROM profiles
      WHERE purchased_nfc = true OR nfc_issued = true
      ORDER BY full_name ASC
      LIMIT 20
    `;

    const [issuanceCount] =
      await sql`SELECT count(*)::int as count FROM nfc_issuances`;
    const [allocationCount] =
      await sql`SELECT count(*)::int as count FROM nfc_allocations`;

    console.log(`Total nfc_issuances rows in DB: ${issuanceCount.count}`);
    console.log(`Total nfc_allocations rows in DB: ${allocationCount.count}\n`);

    if (activeProfiles.length === 0) {
      console.log("No profiles currently have active NFC flags.\n");
    } else {
      console.table(
        activeProfiles.map((p) => ({
          ID: p.id,
          Name: p.full_name,
          Email: p.email,
          Role: p.role,
          Purchased: p.purchased_nfc,
          Issued: p.nfc_issued,
        })),
      );
    }
    await sql.end();
    return;
  }

  // ── RESET ALL USERS ────────────────────────────────────────────────────────
  if (target === "--all") {
    const includeAllocations = args.includes("--include-allocations");
    console.log("Resetting NFC data for ALL users across the database...\n");

    const deletedIssuances = await sql`DELETE FROM nfc_issuances RETURNING id`;
    console.log(
      `Deleted ${deletedIssuances.length} row(s) from nfc_issuances.`,
    );

    if (includeAllocations) {
      const deletedAllocations =
        await sql`DELETE FROM nfc_allocations RETURNING id`;
      console.log(
        `Deleted ${deletedAllocations.length} row(s) from nfc_allocations.`,
      );
    }

    const updatedProfiles = await sql`
      UPDATE profiles
      SET
        purchased_nfc = false,
        nfc_issued = false,
        check_in_token = gen_random_uuid()
      WHERE purchased_nfc = true OR nfc_issued = true
      RETURNING id, email, full_name
    `;

    console.log(
      `Reset ${updatedProfiles.length} profile(s) (purchased_nfc=false, nfc_issued=false, new check_in_token generated).`,
    );
    console.log("\nDone. All NFC state has been completely undone.");
    await sql.end();
    return;
  }

  // ── RESET SINGLE USER (BY EMAIL OR ID) ─────────────────────────────────────
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      target,
    );

  const [profile] = isUuid
    ? await sql`SELECT id, email, full_name, role, purchased_nfc, nfc_issued FROM profiles WHERE id = ${target}`
    : await sql`SELECT id, email, full_name, role, purchased_nfc, nfc_issued FROM profiles WHERE email = ${target} LIMIT 1`;

  if (!profile) {
    console.error(
      `User not found with ${isUuid ? "ID" : "email"}: "${target}"`,
    );
    await sql.end();
    process.exit(1);
  }

  console.log(
    `Found profile: ${profile.full_name} (${profile.email}) [Role: ${profile.role}]`,
  );
  console.log(
    `Previous Status: purchasedNfc = ${profile.purchased_nfc}, nfcIssued = ${profile.nfc_issued}`,
  );

  // Delete issuances where this user is the recipient (or issuer)
  const deletedIssuances = await sql`
    DELETE FROM nfc_issuances
    WHERE user_id = ${profile.id} OR issued_by = ${profile.id}
    RETURNING id
  `;
  console.log(
    `Deleted ${deletedIssuances.length} related row(s) from nfc_issuances.`,
  );

  // Reset profile fields and rotate token to invalidate any previously written physical tag
  const [updated] = await sql`
    UPDATE profiles
    SET
      purchased_nfc = false,
      nfc_issued = false,
      check_in_token = gen_random_uuid()
    WHERE id = ${profile.id}
    RETURNING id, email, full_name, purchased_nfc, nfc_issued, check_in_token
  `;

  console.log("\nProfile successfully reset:");
  console.log({
    id: updated.id,
    name: updated.full_name,
    email: updated.email,
    purchasedNfc: updated.purchased_nfc,
    nfcIssued: updated.nfc_issued,
    newToken: updated.check_in_token,
  });

  console.log(
    "\nDone! Physical tag access revoked and NFC fields reset to default.",
  );
  await sql.end();
}

main().catch(async (err) => {
  console.error("Script failed:", err);
  await sql.end();
  process.exit(1);
});
