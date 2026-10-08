import fs from "node:fs";
import postgres from "postgres";

// Load .env.showcase if present (ignored by git for private email configurations)
if (fs.existsSync(".env.showcase")) {
  process.loadEnvFile(".env.showcase");
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ Error: DATABASE_URL is not set.");
  console.error(
    "Run with: node --env-file=.env.local scripts/seed-showcase.mjs [options]",
  );
  process.exit(1);
}

const sql = postgres(connectionString, {
  prepare: false,
  ssl: { rejectUnauthorized: false },
});

// Parse optional student names JSON from env
let REALISTIC_NAMES = {};
try {
  if (process.env.SHOWCASE_STUDENT_NAMES) {
    REALISTIC_NAMES = JSON.parse(process.env.SHOWCASE_STUDENT_NAMES);
  }
} catch {
  console.warn(
    "⚠️ Warning: Failed to parse SHOWCASE_STUDENT_NAMES JSON from env.",
  );
}

async function main() {
  const args = process.argv.slice(2);
  const organizerIdx = args.findIndex((a) => a === "--organizer" || a === "-o");
  const organizerTarget = organizerIdx !== -1 ? args[organizerIdx + 1] : null;
  const seedAllOrganizers = args.includes("--all-organizers");

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
================================================================================
CEDIS Project Showcase: Predictable Reset & Seed Script
================================================================================
Purpose:
  Deterministically resets the database and seeds realistic, predictable data
  tailored specifically for live booth demonstrations and project evaluations.
  Run this after any demo to restore the exact showcase state in seconds!

Configuration:
  Configure private student and organizer emails in .env.showcase (git ignored).
  See .env.showcase.example for the template.

Usage:
  # Standard reset & seed for primary organizer (recommended):
  pnpm db:showcase
  node --env-file=.env.local scripts/seed-showcase.mjs

  # Target a specific organizer account:
  node --env-file=.env.local scripts/seed-showcase.mjs --organizer organizer@example.com

  # Seed events for all registered organizers simultaneously:
  node --env-file=.env.local scripts/seed-showcase.mjs --all-organizers

Options:
  --organizer, -o <id|email>   Assign showcase events to a specific organizer
  --all-organizers             Replicate showcase events for every organizer
  --help, -h                   Show this help message
================================================================================
`);
    await sql.end();
    process.exit(0);
  }

  console.log(
    "================================================================================",
  );
  console.log(
    "🚀 [CEDIS Showcase] Resetting & Seeding Deterministic Showcase State...",
  );
  console.log(
    "================================================================================\n",
  );

  // ── Step 1: Clean Up Previous Demo State ─────────────────────────────────────
  console.log(
    "🧹 Step 1: Wiping previous demo check-ins, guest walk-ups, and tickets...",
  );

  await sql.begin(async (tx) => {
    // 1. Delete previous NFC issuances
    await tx`DELETE FROM nfc_issuances`;

    // 2. Delete all tickets
    await tx`DELETE FROM tickets`;

    // 3. Delete previous events
    await tx`DELETE FROM events`;

    // 4. Clean up ephemeral ghost walk-up profiles created during previous door sales
    await tx`DELETE FROM profiles WHERE email LIKE 'guest-%@walkup.local'`;
  });

  console.log(
    "   ✓ Cleaned previous issuances, tickets, events, and ephemeral guests.\n",
  );

  // Ensure Realtime publication and FULL replica identity for multi-door live tracking
  try {
    await sql`ALTER PUBLICATION supabase_realtime ADD TABLE tickets;`;
  } catch {
    // Already in publication
  }
  try {
    await sql`ALTER TABLE tickets REPLICA IDENTITY FULL;`;
  } catch {
    // Ignored
  }

  // ── Step 2: Query and Standardize Profiles ──────────────────────────────────
  console.log(
    "👥 Step 2: Loading and preparing student and organizer profiles...",
  );

  const allProfiles = await sql`
    SELECT id, email, full_name, role, check_in_token, purchased_nfc, nfc_issued 
    FROM profiles 
    ORDER BY role ASC, created_at ASC
  `;

  if (allProfiles.length === 0) {
    console.error(
      "❌ No profiles found in the database. Please sign up or log in first.",
    );
    await sql.end();
    process.exit(1);
  }

  // Populate realistic student names if currently empty
  for (const p of allProfiles) {
    const configuredName = REALISTIC_NAMES[p.email.toLowerCase()];
    if (!p.full_name || p.full_name.trim() === "") {
      const generatedName =
        configuredName ||
        p.email
          .split("@")[0]
          .replace(/[._-]+/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

      await sql`
        UPDATE profiles 
        SET full_name = ${generatedName} 
        WHERE id = ${p.id}
      `;
      p.full_name = generatedName;
    }
  }

  // Find organizers
  const organizerList = allProfiles.filter(
    (p) => p.role === "organizer" || p.role === "developer",
  );

  let targetOrganizers = [];

  if (organizerTarget) {
    const matched = organizerList.find(
      (o) =>
        o.id === organizerTarget ||
        o.email.toLowerCase() === organizerTarget.toLowerCase(),
    );
    if (!matched) {
      console.error(`❌ Specified organizer not found: "${organizerTarget}"`);
      await sql.end();
      process.exit(1);
    }
    targetOrganizers = [matched];
  } else if (seedAllOrganizers) {
    targetOrganizers = organizerList.filter((o) => o.role === "organizer");
    if (targetOrganizers.length === 0) targetOrganizers = [organizerList[0]];
  } else {
    // Check if SHOWCASE_ORGANIZER_EMAIL is configured in env
    const preferredEnvEmail = process.env.SHOWCASE_ORGANIZER_EMAIL;
    let preferred = null;
    if (preferredEnvEmail) {
      preferred = organizerList.find(
        (o) => o.email.toLowerCase() === preferredEnvEmail.toLowerCase(),
      );
    }
    targetOrganizers = [preferred || organizerList[0]];
  }

  console.log(
    `   ✓ Target Organizer(s): ${targetOrganizers.map((o) => `${o.full_name || o.email} (${o.email})`).join(", ")}`,
  );

  // Filter students
  const studentProfiles = allProfiles.filter((p) => p.role === "student");

  if (studentProfiles.length < 5) {
    console.warn(
      `   ⚠️ Warning: Only ${studentProfiles.length} student profile(s) found. For best showcase experience, at least 5 profiles are recommended.`,
    );
  } else {
    console.log(
      `   ✓ Found ${studentProfiles.length} student profile(s) for deterministic assignment.`,
    );
  }

  // Reset all student NFC flags to baseline false
  await sql`
    UPDATE profiles 
    SET purchased_nfc = false, nfc_issued = false
    WHERE role = 'student'
  `;

  // ── Step 3: Configure Deterministic Showcase Personas ──────────────────────
  // We designate specific student personas for live demo testing:
  // 1. Clean Door Scan Candidate (success on scan)
  // 2. Duplicate Scan Candidate (already checked in -> amber alert)
  // 3. NFC Handover Candidate (purchased NFC, unissued -> opens handover modal)
  // 4. Walk-Up Door Sale Candidate (registered student without ticket -> sell door ticket)
  // 5. Existing Walk-Up Attendee (already bought at door -> demonstrates dashboard revenue)

  // Map from env variable or fallback to index
  const findStudentByEnv = (envVarKey, fallbackIndex) => {
    const targetEmail = process.env[envVarKey];
    if (targetEmail) {
      const found = studentProfiles.find(
        (s) => s.email.toLowerCase() === targetEmail.trim().toLowerCase(),
      );
      if (found) return found;
    }
    return studentProfiles[fallbackIndex % studentProfiles.length];
  };

  const personaCleanScan = findStudentByEnv("SHOWCASE_STUDENT_CLEAN_SCAN", 0);
  const personaCleanScan2 = findStudentByEnv(
    "SHOWCASE_STUDENT_CLEAN_SCAN_2",
    1,
  );
  const personaAlreadyScanned = findStudentByEnv(
    "SHOWCASE_STUDENT_ALREADY_SCANNED",
    2,
  );
  const personaNfcHandover = findStudentByEnv(
    "SHOWCASE_STUDENT_NFC_HANDOVER",
    3,
  );
  const personaWalkUpSale = findStudentByEnv("SHOWCASE_STUDENT_WALKUP_SALE", 4);
  const personaWalkUpPaid = findStudentByEnv("SHOWCASE_STUDENT_WALKUP_PAID", 5);

  // Set NFC Handover candidate flags: purchased_nfc = true, nfc_issued = false
  await sql`
    UPDATE profiles 
    SET purchased_nfc = true, nfc_issued = false
    WHERE id = ${personaNfcHandover.id}
  `;
  personaNfcHandover.purchased_nfc = true;
  personaNfcHandover.nfc_issued = false;

  console.log("   ✓ Designated showcase test personas successfully.");

  // ── Step 4: Ensure Organizer NFC Tag Stock ──────────────────────────────────
  for (const org of targetOrganizers) {
    // Delete existing allocations to keep state predictable
    await sql`DELETE FROM nfc_allocations WHERE organizer_id = ${org.id}`;
    // Insert fresh 100 blank tags allocation
    await sql`
      INSERT INTO nfc_allocations (organizer_id, amount, notes)
      VALUES (${org.id}, 100, 'Showcase Demo Roll (100 Blank Physical Tags)')
    `;
  }
  console.log(
    "   ✓ Allocated 100 blank physical NFC tags to organizer inventory.\n",
  );

  // ── Step 5: Insert Fixed Showcase Events ────────────────────────────────────
  console.log(
    "📅 Step 5: Creating fixed realistic events (Past, Today Live, Upcoming)...",
  );

  const now = new Date();
  const addDays = (days, h = 10, m = 0) => {
    const d = new Date(now.getTime() + days * 86400 * 1000);
    d.setHours(h, m, 0, 0);
    return d;
  };

  // Today times:
  // Primary Showcase Event: starts in 2 hours
  const todayShowcaseTime = new Date(now.getTime() + 2 * 3600 * 1000);
  const todayAcousticTime = new Date(now.getTime() + 5 * 3600 * 1000);

  const eventTemplates = [
    // ── 1. MAIN TODAY SHOWCASE EVENT (The Live Demo Event) ────────────────────
    {
      key: "MAIN_SHOWCASE",
      category: "TODAY (LIVE DEMO)",
      title: "Internship Seminar TU Hmawbi",
      dateTime: todayShowcaseTime,
      location: "Innovation Hub, Lab 304 (Level 3)",
      maxCapacity: 80,
      price: 5000,
      description: `### 24-Hour AI Prototype Challenge & Showcase
Build intelligent agents, local LLM applications, and computer vision models. High-speed campus Wi-Fi, mentorship desk, and coffee bar provided throughout the event.

#### Entrance & Ticketing Guidelines:
- Present your student QR code on your mobile device or tap your physical NFC card at the entrance desk.
- Walk-up registration is available at the door for 5,000 MMK (cash).
- Pre-ordered physical NFC smart cards can be picked up at the organizer desk upon check-in.`,
    },

    // ── 2. SECONDARY TODAY EVENT (Free Campus Gathering) ─────────────────────
    {
      key: "TODAY_ACOUSTIC",
      category: "TODAY (EVENING)",
      title: "Campus Live Acoustic Evening",
      dateTime: todayAcousticTime,
      location: "Central Amphitheater Garden",
      maxCapacity: 150,
      price: 0,
      description: `### Unwind with Live Campus Music Under the Stars
Enjoy acoustic sets performed by university student bands and solo vocalists. Free admission for all university students, faculty members, and campus visitors.`,
    },

    // ── 3. PAST COMPLETED EVENTS (Tests Hidden Scan Button & History) ─────────
    {
      key: "PAST_SUMMIT",
      category: "PAST (COMPLETED)",
      title: "Campus Tech Summit 2026",
      dateTime: addDays(-4, 10, 0), // 4 days ago
      location: "Main Tech Auditorium, Block A",
      maxCapacity: 120,
      price: 0,
      description: `### Campus Tech Summit 2026
Keynotes on modern edge computing, offline sync architectures, and distributed systems. Student project demonstrations and alumni career networking panel.`,
    },
    {
      key: "PAST_ORIENTATION",
      category: "PAST (COMPLETED)",
      title: "Freshmen Orientation & Welcome Bash",
      dateTime: addDays(-8, 16, 0), // 8 days ago
      location: "Main Gymnasium & Sports Complex",
      maxCapacity: 250,
      price: 0,
      description: `### Welcome Class of 2026!
Introduction to campus clubs, student life, and leadership opportunities. Free merchandise and snack boxes distributed at the door.`,
    },

    // ── 4. FUTURE UPCOMING EVENTS (Tests Student Catalog & RSVP) ─────────────
    {
      key: "FUTURE_ESPORTS",
      category: "FUTURE (UPCOMING)",
      title: "Inter-College Esports Championship",
      dateTime: addDays(3, 13, 0), // In 3 days
      location: "Student Activity Center, Hall 1",
      maxCapacity: 100,
      price: 10000,
      description: `### The Battle for Campus Glory
Competitive tournament featuring Mobile Legends, Valorant, and EA Sports FC. Spectator seating, live commentary casting, and tournament merchandise.`,
    },
    {
      key: "FUTURE_SECURITY",
      category: "FUTURE (UPCOMING)",
      title: "Cybersecurity & Ethical Hacking Hands-On",
      dateTime: addDays(7, 15, 30), // In 7 days
      location: "Science Complex, Room 402",
      maxCapacity: 60,
      price: 0,
      description: `### Defensive Security & Zero-Trust Auditing
Hands-on laboratory workshop covering zero-trust identity, SQL injection mitigation, and web application security auditing. Please bring your own laptop.`,
    },
    {
      key: "FUTURE_DESIGN",
      category: "FUTURE (UPCOMING)",
      title: "Design Sprint & UI/UX Portfolio Clinic",
      dateTime: addDays(14, 11, 0), // In 14 days
      location: "Creative Arts Wing, Studio B",
      maxCapacity: 45,
      price: 0,
      description: `### Crafting High-Conversion Product Interfaces
Interactive workshop on micro-interactions, responsive typography, and tactile UI design. Bring your Figma sketches for direct mentor feedback.`,
    },
    {
      key: "FUTURE_GALA",
      category: "FUTURE (UPCOMING)",
      title: "Grand Cultural Festival & Food Carnival",
      dateTime: addDays(28, 17, 0), // In 28 days
      location: "North Oval Lawn & Food Street",
      maxCapacity: 500,
      price: 15000,
      description: `### Annual Campus Gala & Food Fair
Over 40 international food stalls, cultural dance performances, traditional craft displays, and the grand annual student fireworks ceremony.`,
    },
  ];

  // Store inserted events
  const insertedEvents = [];

  for (const org of targetOrganizers) {
    for (const tpl of eventTemplates) {
      const [ev] = await sql`
        INSERT INTO events (
          title,
          description,
          date_time,
          location,
          max_capacity,
          price,
          organizer_id
        ) VALUES (
          ${tpl.title},
          ${tpl.description},
          ${tpl.dateTime},
          ${tpl.location},
          ${tpl.maxCapacity},
          ${tpl.price},
          ${org.id}
        )
        RETURNING id, title, date_time, location, max_capacity, price, organizer_id
      `;
      insertedEvents.push({ ...ev, key: tpl.key, category: tpl.category });
    }
  }

  console.log(
    `   ✓ Inserted ${insertedEvents.length} events across timeline.\n`,
  );

  // ── Step 6: Insert Deterministic Tickets ─────────────────────────────────────
  console.log(
    "🎟️ Step 6: Issuing fixed, predictable tickets for showcase personas...",
  );

  let ticketCount = 0;
  let checkedInCount = 0;

  // Find the primary demo event (the Today Showcase Event)
  const mainShowcaseEvent = insertedEvents.find(
    (e) => e.key === "MAIN_SHOWCASE",
  );
  const acousticEvent = insertedEvents.find((e) => e.key === "TODAY_ACOUSTIC");
  const pastSummitEvent = insertedEvents.find((e) => e.key === "PAST_SUMMIT");
  const pastOrientationEvent = insertedEvents.find(
    (e) => e.key === "PAST_ORIENTATION",
  );
  const esportsEvent = insertedEvents.find((e) => e.key === "FUTURE_ESPORTS");
  const securityEvent = insertedEvents.find((e) => e.key === "FUTURE_SECURITY");
  const designEvent = insertedEvents.find((e) => e.key === "FUTURE_DESIGN");

  // Helper to insert ticket
  const insertTicket = async ({
    userId,
    eventId,
    isCheckedIn,
    scannedAt,
    purchaseMethod = "online",
  }) => {
    if (!userId || !eventId) return;
    try {
      await sql`
        INSERT INTO tickets (
          user_id,
          event_id,
          is_checked_in,
          scanned_at,
          purchase_method
        ) VALUES (
          ${userId},
          ${eventId},
          ${isCheckedIn},
          ${scannedAt},
          ${purchaseMethod}
        )
        ON CONFLICT (user_id, event_id) DO UPDATE SET
          is_checked_in = EXCLUDED.is_checked_in,
          scanned_at = EXCLUDED.scanned_at,
          purchase_method = EXCLUDED.purchase_method
      `;
      ticketCount++;
      if (isCheckedIn) checkedInCount++;
    } catch (err) {
      console.error(`Failed to insert ticket:`, err.message);
    }
  };

  // 1. PRIMARY SHOWCASE EVENT (The Booth Demo Event)
  // ────────────────────────────────────────────────
  // Test Candidate 1: Clean Ready-to-Scan Student
  await insertTicket({
    userId: personaCleanScan.id,
    eventId: mainShowcaseEvent.id,
    isCheckedIn: false,
    scannedAt: null,
    purchaseMethod: "online",
  });

  // Test Candidate 2: Clean Ready-to-Scan Student #2
  await insertTicket({
    userId: personaCleanScan2.id,
    eventId: mainShowcaseEvent.id,
    isCheckedIn: false,
    scannedAt: null,
    purchaseMethod: "online",
  });

  // Test Candidate 3: Duplicate Scan Student -> Already Checked In 45 mins ago
  const fortyFiveMinsAgo = new Date(Date.now() - 45 * 60 * 1000);
  await insertTicket({
    userId: personaAlreadyScanned.id,
    eventId: mainShowcaseEvent.id,
    isCheckedIn: true,
    scannedAt: fortyFiveMinsAgo,
    purchaseMethod: "online",
  });

  // Test Candidate 4: NFC Tag Handover Student -> Ready to scan, prompts NFC handover modal
  await insertTicket({
    userId: personaNfcHandover.id,
    eventId: mainShowcaseEvent.id,
    isCheckedIn: false,
    scannedAt: null,
    purchaseMethod: "online",
  });

  // Test Candidate 5: Walk-Up Candidate -> NO TICKET on mainShowcaseEvent!
  // (Intentional: scanning their token triggers "Student Recognized: No Ticket -> Sell Walk-Up Ticket")

  // Test Candidate 6: Existing Walk-Up Cash Sale -> Proves walkup stats
  const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);
  await insertTicket({
    userId: personaWalkUpPaid.id,
    eventId: mainShowcaseEvent.id,
    isCheckedIn: true,
    scannedAt: twentyMinsAgo,
    purchaseMethod: "cash_at_door",
  });

  // Add 4 more background students to Today Showcase Event for realistic dashboard metrics
  const remainingStudents = studentProfiles.filter(
    (s) =>
      ![
        personaCleanScan.id,
        personaCleanScan2.id,
        personaAlreadyScanned.id,
        personaNfcHandover.id,
        personaWalkUpSale.id,
        personaWalkUpPaid.id,
      ].includes(s.id),
  );

  // Background attendee 1 (checked in 15 mins ago)
  if (remainingStudents[0]) {
    await insertTicket({
      userId: remainingStudents[0].id,
      eventId: mainShowcaseEvent.id,
      isCheckedIn: true,
      scannedAt: new Date(Date.now() - 15 * 60 * 1000),
      purchaseMethod: "online",
    });
  }
  // Background attendee 2 (checked in 30 mins ago)
  if (remainingStudents[1]) {
    await insertTicket({
      userId: remainingStudents[1].id,
      eventId: mainShowcaseEvent.id,
      isCheckedIn: true,
      scannedAt: new Date(Date.now() - 30 * 60 * 1000),
      purchaseMethod: "online",
    });
  }
  // Background attendee 3 (ready at door)
  if (remainingStudents[2]) {
    await insertTicket({
      userId: remainingStudents[2].id,
      eventId: mainShowcaseEvent.id,
      isCheckedIn: false,
      scannedAt: null,
      purchaseMethod: "online",
    });
  }
  // Background attendee 4 (ready at door)
  if (remainingStudents[3]) {
    await insertTicket({
      userId: remainingStudents[3].id,
      eventId: mainShowcaseEvent.id,
      isCheckedIn: false,
      scannedAt: null,
      purchaseMethod: "online",
    });
  }

  // 2. SECONDARY TODAY EVENT (Campus Acoustic Evening - Free)
  // ────────────────────────────────────────────────────────
  for (const s of [
    personaCleanScan,
    personaAlreadyScanned,
    personaWalkUpSale,
    remainingStudents[0],
  ].filter(Boolean)) {
    await insertTicket({
      userId: s.id,
      eventId: acousticEvent.id,
      isCheckedIn: false,
      scannedAt: null,
      purchaseMethod: "online",
    });
  }

  // 3. PAST EVENTS (Shows attended history on Student profile & tickets)
  // ───────────────────────────────────────────────────────────────────
  if (pastSummitEvent) {
    for (const s of [
      personaCleanScan,
      personaAlreadyScanned,
      personaNfcHandover,
      personaWalkUpPaid,
    ]) {
      const pastTime = new Date(
        pastSummitEvent.date_time.getTime() + 15 * 60 * 1000,
      );
      await insertTicket({
        userId: s.id,
        eventId: pastSummitEvent.id,
        isCheckedIn: true,
        scannedAt: pastTime,
        purchaseMethod: "online",
      });
    }
  }

  if (pastOrientationEvent) {
    for (const s of studentProfiles.slice(0, 6)) {
      const pastTime = new Date(
        pastOrientationEvent.date_time.getTime() + 10 * 60 * 1000,
      );
      await insertTicket({
        userId: s.id,
        eventId: pastOrientationEvent.id,
        isCheckedIn: true,
        scannedAt: pastTime,
        purchaseMethod: "online",
      });
    }
  }

  // 4. FUTURE EVENTS (Shows upcoming RSVPs in student app)
  // ─────────────────────────────────────────────────────
  if (esportsEvent) {
    for (const s of [
      personaCleanScan,
      personaWalkUpPaid,
      remainingStudents[1],
    ].filter(Boolean)) {
      await insertTicket({
        userId: s.id,
        eventId: esportsEvent.id,
        isCheckedIn: false,
        scannedAt: null,
        purchaseMethod: "online",
      });
    }
  }

  if (securityEvent) {
    for (const s of [personaNfcHandover, personaCleanScan2].filter(Boolean)) {
      await insertTicket({
        userId: s.id,
        eventId: securityEvent.id,
        isCheckedIn: false,
        scannedAt: null,
        purchaseMethod: "online",
      });
    }
  }

  if (designEvent) {
    for (const s of [personaAlreadyScanned, remainingStudents[2]].filter(
      Boolean,
    )) {
      await insertTicket({
        userId: s.id,
        eventId: designEvent.id,
        isCheckedIn: false,
        scannedAt: null,
        purchaseMethod: "online",
      });
    }
  }

  console.log("   ✓ Issued all deterministic tickets.\n");

  // ── Step 7: Print Showcase Cheat Sheet & Dashboard Summary ─────────────────
  const primaryOrg = targetOrganizers[0];

  console.log(
    "================================================================================",
  );
  console.log(
    "🎯 CEDIS PROJECT SHOWCASE CHEAT SHEET (PRINT OR KEEP OPEN ON BOOTH DESK)",
  );
  console.log(
    "================================================================================\n",
  );

  console.log(
    `📌 Primary Organizer Login:   ${primaryOrg.email} (${primaryOrg.full_name || "Organizer"})`,
  );
  console.log(`📌 Organizer Dashboard URL:   http://localhost:3000/dashboard`);
  console.log(
    `📌 Door Scanner URL:          http://localhost:3000/scan?event=${mainShowcaseEvent.id}\n`,
  );

  console.log(
    "────────────────────────────────────────────────────────────────────────────────",
  );
  console.log("DEMO TEST SCENARIOS (Guaranteed 100% Predictable Behavior):");
  console.log(
    "────────────────────────────────────────────────────────────────────────────────",
  );

  const personasSummary = [
    {
      Scenario: "1. Clean Door Scan (Green Chime)",
      Student: personaCleanScan.full_name,
      Email: personaCleanScan.email,
      Token: personaCleanScan.check_in_token,
      "Expected Result": "Success! Instant check-in & audio chime.",
    },
    {
      Scenario: "2. Clean Door Scan #2",
      Student: personaCleanScan2.full_name,
      Email: personaCleanScan2.email,
      Token: personaCleanScan2.check_in_token,
      "Expected Result": "Success! Second smooth door scan demo.",
    },
    {
      Scenario: "3. Duplicate Scan Warning (Amber)",
      Student: personaAlreadyScanned.full_name,
      Email: personaAlreadyScanned.email,
      Token: personaAlreadyScanned.check_in_token,
      "Expected Result": "Warning! 'Already Checked In 45 mins ago'.",
    },
    {
      Scenario: "4. Physical NFC Tag Handover",
      Student: personaNfcHandover.full_name,
      Email: personaNfcHandover.email,
      Token: personaNfcHandover.check_in_token,
      "Expected Result": "Opens Handover Modal! Write tag & confirm.",
    },
    {
      Scenario: "5. Walk-Up Cash Sale (No Ticket)",
      Student: personaWalkUpSale.full_name,
      Email: personaWalkUpSale.email,
      Token: personaWalkUpSale.check_in_token,
      "Expected Result": "Prompts 'Collect 5,000 MMK' & issues ticket.",
    },
    {
      Scenario: "6. Existing Walk-Up Attendee",
      Student: personaWalkUpPaid.full_name,
      Email: personaWalkUpPaid.email,
      Token: personaWalkUpPaid.check_in_token,
      "Expected Result": "Reflects in Dashboard Cash Collected stats.",
    },
  ];

  console.table(personasSummary);

  console.log(
    "────────────────────────────────────────────────────────────────────────────────",
  );
  console.log(
    "TODAY SHOWCASE EVENT OVERVIEW (AI Hackathon & Project Expo 2026):",
  );
  console.log(
    "────────────────────────────────────────────────────────────────────────────────",
  );

  // Query actual counts from DB
  const [eventStats] = await sql`
    SELECT 
      count(*)::int as total_tickets,
      count(*) filter (where is_checked_in = true)::int as checked_in,
      count(*) filter (where is_checked_in = false)::int as ready_at_door,
      count(*) filter (where purchase_method = 'cash_at_door')::int as walkup_sales
    FROM tickets
    WHERE event_id = ${mainShowcaseEvent.id}
  `;

  console.log(`  • Event ID:           ${mainShowcaseEvent.id}`);
  console.log(`  • Ticket Price:       5,000 MMK`);
  console.log(`  • Max Capacity:       80 seats`);
  console.log(`  • Total Registered:   ${eventStats.total_tickets} students`);
  console.log(`  • Already Checked In: ${eventStats.checked_in} attendees`);
  console.log(
    `  • Ready At Door:      ${eventStats.ready_at_door} attendees (ready for live scan)`,
  );
  console.log(
    `  • Door Cash Sales:    ${eventStats.walkup_sales} (5,000 MMK collected)`,
  );
  console.log(
    `  • Blank NFC Inventory: 100 tags in stock (0 low-stock warnings)`,
  );

  console.log(
    "\n────────────────────────────────────────────────────────────────────────────────",
  );
  console.log("QUICK RESET INSTRUCTION:");
  console.log(
    "────────────────────────────────────────────────────────────────────────────────",
  );
  console.log(
    "Whenever you finish a showcase session with judges/visitors, simply run:",
  );
  console.log("  pnpm db:showcase");
  console.log(
    "Everything will be restored to this exact clean demo state in 1 second!\n",
  );

  await sql.end();
}

main().catch(async (err) => {
  console.error(
    "\n❌ Fatal error during showcase seeding:",
    err.message || err,
  );
  await sql.end();
  process.exit(1);
});
