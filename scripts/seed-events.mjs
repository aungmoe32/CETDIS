import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ Error: DATABASE_URL is not set.");
  console.error(
    "Run with: node --env-file=.env.local scripts/seed-events.mjs [options]",
  );
  process.exit(1);
}

const sql = postgres(connectionString, {
  prepare: false,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const args = process.argv.slice(2);
  const shouldReset = args.includes("--reset") || args.includes("-r");
  const organizerIdx = args.findIndex((a) => a === "--organizer" || a === "-o");
  const organizerTarget = organizerIdx !== -1 ? args[organizerIdx + 1] : null;

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
CETDIS Mock Events & Tickets Seeder
================================================================================
Usage:
  # 1. Seed past, present (today), and future mock events:
  pnpm db:seed-events
  node --env-file=.env.local scripts/seed-events.mjs

  # 2. Reset database and seed fresh mock events:
  pnpm db:seed-events --reset
  node --env-file=.env.local scripts/seed-events.mjs --reset

  # 3. Assign seeded events to a specific organizer:
  node --env-file=.env.local scripts/seed-events.mjs --organizer organizer@example.com

Options:
  --reset, -r            Wipe existing events and tickets before seeding
  --organizer, -o <id>   Assign events to a specific organizer email or UUID
================================================================================
`);
    await sql.end();
    process.exit(0);
  }

  console.log("🌱 [CETDIS Seeder] Starting mock data generation...\n");

  // Step 1: Find organizers
  let organizerId = null;
  if (organizerTarget) {
    const [org] = await sql`
      SELECT id, email, full_name, role FROM profiles 
      WHERE id::text = ${organizerTarget} OR LOWER(email) = ${organizerTarget.toLowerCase()}
      LIMIT 1
    `;
    if (!org) {
      console.error(`❌ Specified organizer not found: "${organizerTarget}"`);
      await sql.end();
      process.exit(1);
    }
    organizerId = org.id;
    console.log(
      `Selected organizer: ${org.full_name || "Organizer"} (${org.email})`,
    );
  } else {
    // Find first organizer or developer
    const organizers = await sql`
      SELECT id, email, full_name, role FROM profiles 
      WHERE role IN ('organizer', 'developer')
      ORDER BY role ASC, created_at ASC
    `;
    if (organizers.length === 0) {
      // Fallback to any profile
      const [anyProfile] =
        await sql`SELECT id, email, full_name, role FROM profiles LIMIT 1`;
      if (!anyProfile) {
        console.error(
          "❌ No profiles found in the database. Please sign up or log in first.",
        );
        await sql.end();
        process.exit(1);
      }
      organizerId = anyProfile.id;
      console.log(
        `⚠️ No organizer profile found. Using profile: ${anyProfile.email}`,
      );
    } else {
      organizerId = organizers[0].id;
      console.log(
        `Assigning to organizer: ${organizers[0].full_name || "Organizer"} (${organizers[0].email})`,
      );
    }
  }

  // Step 2: Query students to attach mock tickets
  const students = await sql`
    SELECT id, email, full_name, check_in_token FROM profiles 
    WHERE role = 'student'
    ORDER BY created_at ASC
  `;
  console.log(
    `Found ${students.length} student profile(s) to participate in mock RSVPs.\n`,
  );

  // Step 3: Optional Reset
  if (shouldReset) {
    console.log(
      "🧹 Wiping existing tickets and events as requested (--reset)...",
    );
    await sql.begin(async (tx) => {
      await tx`DELETE FROM tickets`;
      await tx`DELETE FROM events`;
    });
    console.log("✅ Clean slate ready.\n");
  }

  // Step 4: Define realistic events (Past, Present/Today, Future)
  const now = new Date();

  // Helper date builders
  const addHours = (hours) => new Date(now.getTime() + hours * 3600 * 1000);
  const addDays = (days, setHour = 14, setMinute = 0) => {
    const d = new Date(now.getTime() + days * 86400 * 1000);
    d.setHours(setHour, setMinute, 0, 0);
    return d;
  };

  const mockEventsData = [
    // ── PAST EVENTS ──────────────────────────────────────────────────────────
    {
      category: "PAST",
      title: "Campus Tech Summit 2026",
      dateTime: addDays(-6, 10, 0), // 6 days ago at 10:00 AM
      location: "Main Tech Auditorium, Block A",
      maxCapacity: 120,
      price: 0,
      description: `### Campus Tech Summit 2026
Join leading industry architects and university alumni as we explore modern web frameworks, distributed systems, and real-time offline sync architectures.

#### Highlights
- Keynote on Distributed Databases & Edge Computing
- Student Innovation Showcase
- Career Networking Session with Tech Founders`,
    },
    {
      category: "PAST",
      title: "Freshmen Orientation & Welcome Bash",
      dateTime: addDays(-2, 16, 0), // 2 days ago at 4:00 PM
      location: "Main Gymnasium & Sports Complex",
      maxCapacity: 250,
      price: 0,
      description: `### Welcome Class of 2026!
A fun-filled evening introducing campus clubs, student life, and leadership opportunities. Free merchandise and snack boxes distributed at the door.`,
    },

    // ── PRESENT / TODAY EVENTS ──────────────────────────────────────────────
    {
      category: "TODAY",
      title: "AI Hackathon & Project Expo",
      dateTime: addHours(2), // Today, 2 hours from now!
      location: "Innovation Hub, Lab 304",
      maxCapacity: 80,
      price: 5000,
      description: `### 24-Hour AI Prototype Challenge
Build agents, LLM applications, and computer vision models. High-speed campus Wi-Fi, mentorship desk, and coffee bar provided throughout the event.

*Door Policy*
- Scan your digital QR pass or tap your physical NFC card at the entrance gate.
- Walk-up ticketing available at the door for 5,000 MMK.`,
    },
    {
      category: "TODAY",
      title: "Campus Live Acoustic Evening",
      dateTime: addHours(5), // Today, evening
      location: "Central Amphitheater Garden",
      maxCapacity: 150,
      price: 0,
      description: `### Unwind with Live Campus Music
Enjoy acoustic sets performed by university bands and solo vocalists under the stars. Free admission for all students and faculty members.`,
    },

    // ── FUTURE UPCOMING EVENTS ──────────────────────────────────────────────
    {
      category: "FUTURE",
      title: "Inter-College Esports Championship",
      dateTime: addDays(3, 13, 0), // In 3 days at 1:00 PM
      location: "Student Activity Center, Hall 1",
      maxCapacity: 100,
      price: 10000,
      description: `### The Battle for Campus Glory
Competitive tournament featuring Mobile Legends, Valorant, and EA Sports FC. Spectator seating, live commentary casting, and tournament merchandise.`,
    },
    {
      category: "FUTURE",
      title: "Cybersecurity & Ethical Hacking Hands-On",
      dateTime: addDays(7, 15, 30), // In 7 days at 3:30 PM
      location: "Science Complex, Room 402",
      maxCapacity: 60,
      price: 0,
      description: `### Defensive Security & Threat Modeling
Hands-on laboratory workshop covering zero-trust identity, SQL injection mitigation, and web application security auditing. Please bring your own laptop.`,
    },
    {
      category: "FUTURE",
      title: "Design Sprint & UI/UX Portfolio Clinic",
      dateTime: addDays(14, 11, 0), // In 2 weeks at 11:00 AM
      location: "Creative Arts Wing, Studio B",
      maxCapacity: 45,
      price: 0,
      description: `### Crafting High-Conversion Product Interfaces
Interactive workshop on micro-interactions, responsive typography, and tactile UI design. Bring your Figma sketches for direct mentor feedback.`,
    },
    {
      category: "FUTURE",
      title: "Grand Cultural Festival & Food Carnival",
      dateTime: addDays(28, 17, 0), // In 4 weeks at 5:00 PM
      location: "North Oval Lawn & Food Street",
      maxCapacity: 500,
      price: 15000,
      description: `### Annual Campus Gala & Food Fair
Over 40 international food stalls, cultural dance performances, traditional craft displays, and the grand annual student fireworks ceremony.`,
    },
  ];

  console.log(
    `Inserting ${mockEventsData.length} events across PAST, TODAY, and FUTURE timeline...\n`,
  );

  const createdEvents = [];

  for (const item of mockEventsData) {
    const [inserted] = await sql`
      INSERT INTO events (
        title,
        description,
        date_time,
        location,
        max_capacity,
        price,
        organizer_id
      ) VALUES (
        ${item.title},
        ${item.description},
        ${item.dateTime},
        ${item.location},
        ${item.maxCapacity},
        ${item.price},
        ${organizerId}
      )
      RETURNING id, title, date_time, location, max_capacity, price
    `;
    createdEvents.push({ ...inserted, category: item.category });
  }

  // Step 5: Issue sample tickets if students exist
  let ticketCount = 0;
  let checkedInCount = 0;

  if (students.length > 0) {
    console.log(
      "🎟️ Generating realistic student ticket RSVPs and check-in states...",
    );

    for (const event of createdEvents) {
      // Pick a subset of students for this event
      const numTickets = Math.min(
        students.length,
        event.category === "PAST"
          ? students.length
          : Math.max(2, Math.floor(students.length * 0.75)),
      );

      for (let i = 0; i < numTickets; i++) {
        const student = students[i];
        const isPast = event.category === "PAST";
        const isToday = event.category === "TODAY";

        // For past events: 80% checked in. For today: 30% checked in. For future: 0% checked in.
        let isCheckedIn = false;
        let scannedAt = null;

        if (isPast && i % 4 !== 0) {
          isCheckedIn = true;
          scannedAt = new Date(
            new Date(event.date_time).getTime() + 15 * 60 * 1000,
          ); // 15 mins after start
          checkedInCount++;
        } else if (isToday && i === 0) {
          isCheckedIn = true;
          scannedAt = new Date();
          checkedInCount++;
        }

        try {
          await sql`
            INSERT INTO tickets (
              user_id,
              event_id,
              is_checked_in,
              scanned_at,
              purchase_method
            ) VALUES (
              ${student.id},
              ${event.id},
              ${isCheckedIn},
              ${scannedAt},
              ${i % 3 === 0 ? "cash_at_door" : "online"}
            )
            ON CONFLICT (user_id, event_id) DO NOTHING
          `;
          ticketCount++;
        } catch {
          // Ignore duplicates
        }
      }
    }
  }

  // Step 6: Summary table
  console.log(
    "\n================================================================================",
  );
  console.log("✅ Seed Complete! Overview of Generated Events:");
  console.log(
    "================================================================================\n",
  );

  console.table(
    createdEvents.map((e) => {
      const dt = new Date(e.date_time);
      return {
        Timeline: e.category,
        Title: e.title,
        "Date & Time": `${dt.toLocaleDateString([], { month: "short", day: "numeric" })} ${dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        Venue: e.location.slice(0, 24) + "...",
        Price: e.price === 0 ? "Free" : `${e.price.toLocaleString()} MMK`,
        Capacity: e.max_capacity,
      };
    }),
  );

  console.log(`Summary:`);
  console.log(
    `  • Events created:     ${createdEvents.length} (2 Past, 2 Today, 4 Future)`,
  );
  console.log(`  • Tickets registered: ${ticketCount}`);
  console.log(`  • Already checked-in: ${checkedInCount}`);
  console.log(
    "\n💡 You can now view Today's Events on the Organizer Dashboard and browse upcoming events on the Student Events Catalog!\n",
  );

  await sql.end();
}

main().catch(async (err) => {
  console.error("\n❌ Error during seeding:", err.message || err);
  await sql.end();
  process.exit(1);
});
