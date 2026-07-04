import { pgTable, serial, integer, timestamp, text, boolean } from "drizzle-orm/pg-core";
import { studentsTable } from "./students";
import { teachersTable } from "./teachers";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => studentsTable.id),
  teacherId: integer("teacher_id").references(() => teachersTable.id),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"), // info | success | warning
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;
