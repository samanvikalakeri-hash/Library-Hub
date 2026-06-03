import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, loansTable, booksTable, studentsTable, finesTable } from "@workspace/db";
import {
  ListLoansQueryParams,
  ListLoansResponse,
  CreateLoanBody,
  GetLoanParams,
  GetLoanResponse,
  ReturnLoanParams,
  ReturnLoanResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const LOAN_DAYS = 14;
const FINE_PER_DAY = 0.25;

async function updateOverdueStatuses() {
  await db
    .update(loansTable)
    .set({ status: "overdue" })
    .where(
      and(
        eq(loansTable.status, "active"),
        sql`${loansTable.dueDate} < now()`
      )
    );
}

router.get("/loans", async (req, res): Promise<void> => {
  await updateOverdueStatuses();
  const parsed = ListLoansQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { status, studentId } = parsed.data;
  const conditions = [];
  if (status) conditions.push(eq(loansTable.status, status));
  if (studentId) conditions.push(eq(loansTable.studentId, studentId));

  const loans = await db
    .select({
      id: loansTable.id,
      studentId: loansTable.studentId,
      bookId: loansTable.bookId,
      checkedOutAt: loansTable.checkedOutAt,
      dueDate: loansTable.dueDate,
      returnedAt: loansTable.returnedAt,
      status: loansTable.status,
      studentName: studentsTable.name,
      bookTitle: booksTable.title,
      bookAuthor: booksTable.author,
    })
    .from(loansTable)
    .leftJoin(studentsTable, eq(loansTable.studentId, studentsTable.id))
    .leftJoin(booksTable, eq(loansTable.bookId, booksTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${loansTable.checkedOutAt} desc`);

  res.json(ListLoansResponse.parse(loans));
});

router.post("/loans", async (req, res): Promise<void> => {
  const parsed = CreateLoanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { studentId, bookId, dueDate } = parsed.data;

  // Check book availability
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, bookId));
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }
  if (book.availableCopies <= 0) {
    res.status(400).json({ error: "No copies available" });
    return;
  }

  // Check student borrow limit
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId));
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  const [activeCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loansTable)
    .where(and(eq(loansTable.studentId, studentId), sql`${loansTable.status} != 'returned'`));
  if ((activeCount?.count ?? 0) >= student.borrowLimit) {
    res.status(400).json({ error: "Student has reached their borrow limit" });
    return;
  }

  const due = dueDate ? new Date(dueDate) : new Date(Date.now() + LOAN_DAYS * 86400000);

  const [loan] = await db
    .insert(loansTable)
    .values({ studentId, bookId, dueDate: due, status: "active" })
    .returning();

  // Decrement available copies
  await db
    .update(booksTable)
    .set({ availableCopies: book.availableCopies - 1 })
    .where(eq(booksTable.id, bookId));

  res.status(201).json(GetLoanResponse.parse({ ...loan, studentName: student.name, bookTitle: book.title, bookAuthor: book.author }));
});

router.get("/loans/:id", async (req, res): Promise<void> => {
  const params = GetLoanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [loan] = await db
    .select({
      id: loansTable.id,
      studentId: loansTable.studentId,
      bookId: loansTable.bookId,
      checkedOutAt: loansTable.checkedOutAt,
      dueDate: loansTable.dueDate,
      returnedAt: loansTable.returnedAt,
      status: loansTable.status,
      studentName: studentsTable.name,
      bookTitle: booksTable.title,
      bookAuthor: booksTable.author,
    })
    .from(loansTable)
    .leftJoin(studentsTable, eq(loansTable.studentId, studentsTable.id))
    .leftJoin(booksTable, eq(loansTable.bookId, booksTable.id))
    .where(eq(loansTable.id, params.data.id));

  if (!loan) {
    res.status(404).json({ error: "Loan not found" });
    return;
  }
  res.json(GetLoanResponse.parse(loan));
});

router.post("/loans/:id/return", async (req, res): Promise<void> => {
  const params = ReturnLoanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db.select().from(loansTable).where(eq(loansTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Loan not found" });
    return;
  }
  if (existing.status === "returned") {
    res.status(400).json({ error: "Book already returned" });
    return;
  }

  const now = new Date();
  const [loan] = await db
    .update(loansTable)
    .set({ status: "returned", returnedAt: now })
    .where(eq(loansTable.id, params.data.id))
    .returning();

  // Increment available copies
  await db
    .update(booksTable)
    .set({ availableCopies: sql`${booksTable.availableCopies} + 1` })
    .where(eq(booksTable.id, existing.bookId));

  // Calculate fine if overdue
  if (now > existing.dueDate) {
    const daysLate = Math.ceil((now.getTime() - existing.dueDate.getTime()) / 86400000);
    const amount = (daysLate * FINE_PER_DAY).toFixed(2);
    await db.insert(finesTable).values({
      studentId: existing.studentId,
      loanId: existing.id,
      amount,
      reason: `Late return — ${daysLate} day(s) overdue`,
      paid: false,
    });
  }

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, loan.studentId));
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, loan.bookId));

  res.json(ReturnLoanResponse.parse({ ...loan, studentName: student?.name, bookTitle: book?.title, bookAuthor: book?.author }));
});

export default router;
