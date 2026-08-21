import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const players = pgTable("players", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull().default(""),
  bestScore: integer("best_score").notNull().default(0),
  gamesPlayed: integer("games_played").notNull().default(0),
  // Игровые монеты — меняются на рубли по курсу из настроек
  coins: integer("coins").notNull().default(0),
  // Рублёвый баланс (доля с показов рекламы + обмен монет)
  rub: numeric("rub", { precision: 14, scale: 4 }).notNull().default("0"),
  totalEarned: numeric("total_earned", { precision: 14, scale: 4 })
    .notNull()
    .default("0"),
  adViews: integer("ad_views").notNull().default(0),
  // Косметика: выбранные и купленные предметы
  skin: text("skin").notNull().default("slime"),
  background: text("background").notNull().default("night"),
  ownedItems: text("owned_items").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    playerId: uuid("player_id").notNull(),
    score: integer("score").notNull().default(0),
    coins: integer("coins").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("sessions_player_idx").on(t.playerId)],
);

export const adEvents = pgTable(
  "ad_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    playerId: uuid("player_id"),
    // interstitial | rewarded_revive | rewarded_double
    kind: text("kind").notNull(),
    // Полный доход с показа и доля игрока (в рублях)
    revenue: numeric("revenue", { precision: 14, scale: 6 }).notNull(),
    playerShare: numeric("player_share", { precision: 14, scale: 6 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("ad_events_player_idx").on(t.playerId)],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const withdrawals = pgTable(
  "withdrawals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    playerId: uuid("player_id").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    details: text("details").notNull().default(""),
    // pending | paid | rejected
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("withdrawals_player_idx").on(t.playerId)],
);

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    playerId: uuid("player_id").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("auth_tokens_token_idx").on(t.token)],
);

export type Player = typeof players.$inferSelect;
export type Withdrawal = typeof withdrawals.$inferSelect;
