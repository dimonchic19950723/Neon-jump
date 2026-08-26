import { pgTable, serial, varchar, bigint, timestamp, boolean, integer, text, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const vkSources = pgTable("vk_sources", {
  id: serial("id").primaryKey(),
  // Short address (domain) like "vkcom" or "club1"/"public1" screen names; we'll store parsed domain part
  domain: varchar("domain", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }),
  ownerId: bigint("owner_id", { mode: "number" }), // negative for communities
  lastPostId: bigint("last_post_id", { mode: "number" }),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: false }),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
  active: boolean("active").default(true).notNull(),
});

export const vkPosts = pgTable("vk_posts", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").notNull().references(() => vkSources.id, { onDelete: "cascade" }),
  vkPostId: bigint("vk_post_id", { mode: "number" }).notNull().unique(),
  ownerId: bigint("owner_id", { mode: "number" }),
  dateTs: integer("date_ts"), // Unix time from VK
  text: text("text"),
  attachments: jsonb("attachments"),
  sentToTelegram: boolean("sent_to_telegram").default(false).notNull(),
  sentAt: timestamp("sent_at", { withTimezone: false }),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
});

export const vkSourcesRelations = relations(vkSources, ({ many }) => ({
  posts: many(vkPosts),
}));

export const vkPostsRelations = relations(vkPosts, ({ one }) => ({
  source: one(vkSources, { fields: [vkPosts.sourceId], references: [vkSources.id] }),
}));

export type VkSource = typeof vkSources.$inferSelect;
export type NewVkSource = typeof vkSources.$inferInsert;
export type VkPost = typeof vkPosts.$inferSelect;
export type NewVkPost = typeof vkPosts.$inferInsert;
