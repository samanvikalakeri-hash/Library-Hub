import { pgTable, serial, integer, timestamp, text, boolean } from "drizzle-orm/pg-core";
import { studentsTable } from "./students";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"), // info | success | warning
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;
