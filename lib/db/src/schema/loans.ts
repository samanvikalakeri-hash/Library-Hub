import { pgTable, serial, integer, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { teachersTable } from "./teachers";
import { booksTable } from "./books";

export const loansTable = pgTable("loans", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => studentsTable.id),
  teacherId: integer("teacher_id").references(() => teachersTable.id),
  bookId: integer("book_id").notNull().references(() => booksTable.id),
  checkedOutAt: timestamp("checked_out_at").notNull().defaultNow(),
  dueDate: timestamp("due_date").notNull(),
  returnedAt: timestamp("returned_at"),
  status: text("status").notNull().default("active"), // active | returned | overdue
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLoanSchema = createInsertSchema(loansTable).omit({ id: true, createdAt: true, checkedOutAt: true });
export type InsertLoan = z.infer<typeof insertLoanSchema>;
export type Loan = typeof loansTable.$inferSelect;
