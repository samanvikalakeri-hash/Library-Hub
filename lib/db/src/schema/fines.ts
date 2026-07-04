import { pgTable, serial, integer, timestamp, text, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { teachersTable } from "./teachers";
import { loansTable } from "./loans";

export const finesTable = pgTable("fines", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => studentsTable.id),
  teacherId: integer("teacher_id").references(() => teachersTable.id),
  loanId: integer("loan_id").references(() => loansTable.id),
  amount: numeric("amount", { precision: 8, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  paid: boolean("paid").notNull().default(false),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFineSchema = createInsertSchema(finesTable).omit({ id: true, createdAt: true });
export type InsertFine = z.infer<typeof insertFineSchema>;
export type Fine = typeof finesTable.$inferSelect;
