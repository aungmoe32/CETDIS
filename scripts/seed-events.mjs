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
  const allUsers = args.includes("--all-users");
  const organizerIdx = args.findIndex((a) => a === "--organizer" || a === "-o");
  const organizerTarget = organizerIdx !== -1 ? args[organizerIdx + 1] : null;
  const studentIdx = args.findIndex((a) => a === "--student" || a === "-s");
  const studentTarget = studentIdx !== -1 ? args[studentIdx + 1] : null;

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
CETDIS Mock Events & Random Student Tickets Seeder
================================================================================
Usage:
  # 1. Seed past, present (today), and future events with randomized student tickets:
  pnpm db:seed-events
  node --env-file=.env.local scripts/seed-events.mjs

  # 2. Reset database and seed fresh events + randomized student tickets:
  pnpm db:seed-events --reset
  node --env-file=.env.local scripts/seed-events.mjs --reset

  # 3. Assign seeded events to a specific organizer:
  node --env-file=.env.local scripts/seed-events.mjs --organizer organizer@example.com

  # 4. Generate random tickets for a specific student/developer:
  node --env-file=.env.local scripts/seed-events.mjs --student student@example.com

Options:
  --reset, -r            Wipe existing events and tickets before seeding
  --organizer, -o <id>   Assign events to a specific organizer email or UUID
  --student, -s <id>     Only seed tickets for a specific student/dev email or UUID
  --all-users            Include all profiles (even organizers) for student ticket mock
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

  // Step 2: Query students & developers eligible for randomized tickets
  let students;
  if (studentTarget) {
    students = await sql`
      SELECT id, email, full_name, role, check_in_token FROM profiles 
      WHERE id::text = ${studentTarget} OR LOWER(email) = ${studentTarget.toLowerCase()}
    `;
    if (students.length === 0) {
      console.error(`❌ Specified student not found: "${studentTarget}"`);
      await sql.end();
      process.exit(1);
    }
    console.log(
      `Targeted student: ${students[0].full_name || "Student"} (${students[0].email}) [role: ${students[0].role}]`,
    );
  } else if (allUsers) {
    students = await sql`
      SELECT id, email, full_name, role, check_in_token FROM profiles 
      ORDER BY created_at ASC
    `;
    console.log(`Found ${students.length} total profile(s) to participate in mock RSVPs.`);
  } else {
    // Include all students and developers (so developers testing student views also get mock tickets)
    students = await sql`
      SELECT id, email, full_name, role, check_in_token FROM profiles 
      WHERE role IN ('student', 'developer')
      ORDER BY created_at ASC
    `;
    console.log(
      `Found ${students.length} student & tester profile(s) to participate in mock RSVPs.\n`,
    );
  }

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

  // Helper function to shuffle an array
  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Helper random int between min and max inclusive
  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Step 5: Issue randomized tickets per student
  let ticketCount = 0;
  let checkedInCount = 0;

  // Track detailed metrics per student
  const studentStats = new Map(
    students.map((s) => [
      s.id,
      {
        id: s.id,
        email: s.email,
        name: s.full_name || s.email.split("@")[0],
        role: s.role,
        tickets: 0,
        pastAttended: 0,
        pastMissed: 0,
        todayScanned: 0,
        todayReady: 0,
        futureUpcoming: 0,
      },
    ]),
  );

  // Track event registration count
  const eventRegistrations = new Map(
    createdEvents.map((e) => [
      e.id,
      {
        ...e,
        total: 0,
        checkedIn: 0,
        pending: 0,
      },
    ]),
  );

  if (students.length > 0) {
    console.log(
      "🎲 Generating individualized random tickets & realistic check-in states per student...",
    );

    // 1. Iterate per student and assign a randomized number of tickets
    for (const student of students) {
      const stats = studentStats.get(student.id);

      // Student activity profiles:
      // ~20% casual (1 to 2 tickets)
      // ~50% regular (2 to 4 tickets)
      // ~30% active (4 to 6 tickets)
      const roll = Math.random();
      let targetTicketCount;
      if (roll < 0.2) {
        targetTicketCount = randomInt(1, 2);
      } else if (roll < 0.7) {
        targetTicketCount = randomInt(2, 4);
      } else {
        targetTicketCount = randomInt(4, Math.min(6, createdEvents.length));
      }

      // Pick random distinct events for this student
      const chosenEvents = shuffle(createdEvents).slice(0, targetTicketCount);

      for (const event of chosenEvents) {
        const evReg = eventRegistrations.get(event.id);
        // Ensure event capacity isn't exceeded
        if (evReg && evReg.total >= event.max_capacity) {
          continue;
        }

        const isPast = event.category === "PAST";
        const isToday = event.category === "TODAY";

        let isCheckedIn = false;
        let scannedAt = null;

        if (isPast) {
          // Past events: ~80% attended and checked in, ~20% no-show
          isCheckedIn = Math.random() < 0.8;
          if (isCheckedIn) {
            // Check-in around event start time (-15 mins to +45 mins)
            const eventTime = new Date(event.date_time).getTime();
            const jitterMinutes = randomInt(-15, 45);
            scannedAt = new Date(eventTime + jitterMinutes * 60 * 1000);
            checkedInCount++;
            stats.pastAttended++;
            if (evReg) evReg.checkedIn++;
          } else {
            stats.pastMissed++;
            if (evReg) evReg.pending++;
          }
        } else if (isToday) {
          // Today's events: ~35% already scanned at the door, ~65% ready for door scan!
          isCheckedIn = Math.random() < 0.35;
          if (isCheckedIn) {
            // Scanned earlier today (between 5 and 120 minutes ago)
            const minutesAgo = randomInt(5, 120);
            scannedAt = new Date(Date.now() - minutesAgo * 60 * 1000);
            checkedInCount++;
            stats.todayScanned++;
            if (evReg) evReg.checkedIn++;
          } else {
            stats.todayReady++;
            if (evReg) evReg.pending++;
          }
        } else {
          // Future upcoming events
          stats.futureUpcoming++;
          if (evReg) evReg.pending++;
        }

        // Purchase method: Free events are always 'online', paid are 80% 'online' / 20% 'cash_at_door'
        const purchaseMethod =
          event.price === 0
            ? "online"
            : Math.random() < 0.2
              ? "cash_at_door"
              : "online";

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
              ${purchaseMethod}
            )
            ON CONFLICT (user_id, event_id) DO NOTHING
          `;
          ticketCount++;
          stats.tickets++;
          if (evReg) evReg.total++;
        } catch {
          // Ignore conflict
        }
      }
    }

    // 2. Organizer Testing Quality Assurance Pass:
    // Ensure every TODAY event has at least 1 checked-in attendee and at least 2 pending attendees
    for (const event of createdEvents.filter((e) => e.category === "TODAY")) {
      const evReg = eventRegistrations.get(event.id);
      if (!evReg) continue;

      // Find students not yet registered for this event
      const existingAttendees = await sql`
        SELECT user_id, is_checked_in FROM tickets WHERE event_id = ${event.id}
      `;
      const registeredUserIds = new Set(existingAttendees.map((t) => t.user_id));
      const unassignedStudents = shuffle(
        students.filter((s) => !registeredUserIds.has(s.id)),
      );

      // Need more checked-in attendees?
      let currentCheckedIn = existingAttendees.filter((t) => t.is_checked_in).length;
      let currentPending = existingAttendees.filter((t) => !t.is_checked_in).length;

      while (currentCheckedIn < 1 && unassignedStudents.length > 0) {
        const student = unassignedStudents.pop();
        const minutesAgo = randomInt(10, 60);
        const scannedAt = new Date(Date.now() - minutesAgo * 60 * 1000);
        try {
          await sql`
            INSERT INTO tickets (user_id, event_id, is_checked_in, scanned_at, purchase_method)
            VALUES (${student.id}, ${event.id}, true, ${scannedAt}, 'online')
            ON CONFLICT (user_id, event_id) DO NOTHING
          `;
          ticketCount++;
          checkedInCount++;
          currentCheckedIn++;
          const stats = studentStats.get(student.id);
          if (stats) {
            stats.tickets++;
            stats.todayScanned++;
          }
          evReg.total++;
          evReg.checkedIn++;
        } catch {}
      }

      // Need more pending door scan attendees?
      while (currentPending < 2 && unassignedStudents.length > 0) {
        const student = unassignedStudents.pop();
        try {
          await sql`
            INSERT INTO tickets (user_id, event_id, is_checked_in, scanned_at, purchase_method)
            VALUES (${student.id}, ${event.id}, false, null, 'online')
            ON CONFLICT (user_id, event_id) DO NOTHING
          `;
          ticketCount++;
          currentPending++;
          const stats = studentStats.get(student.id);
          if (stats) {
            stats.tickets++;
            stats.todayReady++;
          }
          evReg.total++;
          evReg.pending++;
        } catch {}
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
      const evReg = eventRegistrations.get(e.id);
      return {
        Timeline: e.category,
        Title: e.title,
        "Date & Time": `${dt.toLocaleDateString([], { month: "short", day: "numeric" })} ${dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        Venue: e.location.length > 24 ? e.location.slice(0, 24) + "..." : e.location,
        Price: e.price === 0 ? "Free" : `${e.price.toLocaleString()} MMK`,
        Capacity: e.max_capacity,
        Registered: evReg ? evReg.total : 0,
        "Checked In": evReg ? evReg.checkedIn : 0,
      };
    }),
  );

  console.log("🎟️ Randomized Student Ticket Distribution:");
  console.table(
    Array.from(studentStats.values()).map((s) => ({
      Student: s.name,
      Email: s.email,
      Role: s.role,
      "Total Tickets": s.tickets,
      "Past (Attended/Missed)": `${s.pastAttended} / ${s.pastMissed}`,
      "Today (Scanned/Ready)": `${s.todayScanned} / ${s.todayReady}`,
      Upcoming: s.futureUpcoming,
    })),
  );

  console.log(`Summary:`);
  console.log(
    `  • Events created:     ${createdEvents.length} (2 Past, 2 Today, 4 Future)`,
  );
  console.log(`  • Tickets registered: ${ticketCount}`);
  console.log(`  • Already checked-in: ${checkedInCount}`);
  console.log(
    `  • Ready at door:      ${ticketCount - checkedInCount}`,
  );
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
