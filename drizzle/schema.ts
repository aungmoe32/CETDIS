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

// ─── Enums ───────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum("role", ["student", "organizer"]);

// ─── Tables ──────────────────────────────────────────────────────────────────

/**
 * profiles — mirrors auth.users.id (UUID from Supabase Auth).
 * Auto-created by a DB trigger on auth.users INSERT.
 */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // = auth.users.id
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: roleEnum("role").notNull().default("student"),
  checkInToken: uuid("check_in_token").notNull().unique().defaultRandom(),
  purchasedNfc: boolean("purchased_nfc").notNull().default(false),
  nfcIssued: boolean("nfc_issued").notNull().default(false),
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
  price: integer("price").notNull().default(0),
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

/**
 * nfc_issuances — immutable ledger tracking which organizer handed out a
 * physical NFC tag to which student, and at which event.
 */
export const nfcIssuances = pgTable("nfc_issuances", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  issuedBy: uuid("issued_by")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  eventId: uuid("event_id").references(() => events.id, {
    onDelete: "set null",
  }),
  issuedAt: timestamp("issued_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const profilesRelations = relations(profiles, ({ many }) => ({
  organizedEvents: many(events),
  tickets: many(tickets),
  receivedNfcIssuances: many(nfcIssuances, { relationName: "student_issuances" }),
  givenNfcIssuances: many(nfcIssuances, { relationName: "organizer_issuances" }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  organizer: one(profiles, {
    fields: [events.organizerId],
    references: [profiles.id],
  }),
  tickets: many(tickets),
  nfcIssuances: many(nfcIssuances),
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

export const nfcIssuancesRelations = relations(nfcIssuances, ({ one }) => ({
  student: one(profiles, {
    fields: [nfcIssuances.userId],
    references: [profiles.id],
    relationName: "student_issuances",
  }),
  organizer: one(profiles, {
    fields: [nfcIssuances.issuedBy],
    references: [profiles.id],
    relationName: "organizer_issuances",
  }),
  event: one(events, {
    fields: [nfcIssuances.eventId],
    references: [events.id],
  }),
}));
