import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, loansTable, booksTable, studentsTable, teachersTable, finesTable, notificationsTable } from "@workspace/db";
import {
  ListLoansQueryParams,
  ListLoansResponse,
  CreateLoanBody,
  GetLoanParams,
  GetLoanResponse,
  ReturnLoanParams,
  ReturnLoanResponse,
} from "@workspace/api-zod";
import { serializeDates } from "../lib/serialize";

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

function buildLoanRow(loan: {
  id: number;
  studentId: number | null;
  teacherId: number | null;
  bookId: number;
  checkedOutAt: Date;
  dueDate: Date;
  returnedAt: Date | null;
  status: string;
  studentName: string | null;
  teacherName: string | null;
  bookTitle: string | null;
  bookAuthor: string | null;
}) {
  const borrowerType = loan.teacherId ? "teacher" : "student";
  const borrowerName = loan.teacherName ?? loan.studentName ?? null;
  return {
    ...loan,
    borrowerType,
    borrowerName,
  };
}

router.get("/loans", async (req, res): Promise<void> => {
  await updateOverdueStatuses();
  const parsed = ListLoansQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { status, studentId, teacherId } = parsed.data;
  const conditions = [];
  if (status) conditions.push(eq(loansTable.status, status));
  if (studentId) conditions.push(eq(loansTable.studentId, studentId));
  if (teacherId) conditions.push(eq(loansTable.teacherId, teacherId));

  const loans = await db
    .select({
      id: loansTable.id,
      studentId: loansTable.studentId,
      teacherId: loansTable.teacherId,
      bookId: loansTable.bookId,
      checkedOutAt: loansTable.checkedOutAt,
      dueDate: loansTable.dueDate,
      returnedAt: loansTable.returnedAt,
      status: loansTable.status,
      studentName: studentsTable.name,
      teacherName: teachersTable.name,
      bookTitle: booksTable.title,
      bookAuthor: booksTable.author,
    })
    .from(loansTable)
    .leftJoin(studentsTable, eq(loansTable.studentId, studentsTable.id))
    .leftJoin(teachersTable, eq(loansTable.teacherId, teachersTable.id))
    .leftJoin(booksTable, eq(loansTable.bookId, booksTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${loansTable.checkedOutAt} desc`);

  res.json(ListLoansResponse.parse(serializeDates(loans.map(buildLoanRow))));
});

router.post("/loans", async (req, res): Promise<void> => {
  const parsed = CreateLoanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { studentId, teacherId, bookId, dueDate } = parsed.data;

  if (!studentId && !teacherId) {
    res.status(400).json({ error: "Either studentId or teacherId is required" });
    return;
  }

  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, bookId));
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }
  if (book.availableCopies <= 0) {
    res.status(400).json({ error: "No copies available" });
    return;
  }

  let borrowerName: string | null = null;

  if (studentId) {
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
      res.status(400).json({ error: `Student has reached their borrow limit of ${student.borrowLimit}` });
      return;
    }
    borrowerName = student.name;
  }

  if (teacherId) {
    const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.id, teacherId));
    if (!teacher) {
      res.status(404).json({ error: "Teacher not found" });
      return;
    }
    const [activeCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(loansTable)
      .where(and(eq(loansTable.teacherId, teacherId), sql`${loansTable.status} != 'returned'`));
    if ((activeCount?.count ?? 0) >= teacher.borrowLimit) {
      res.status(400).json({ error: `Teacher has reached their borrow limit of ${teacher.borrowLimit}` });
      return;
    }
    borrowerName = teacher.name;
  }

  const due = dueDate ? new Date(dueDate) : new Date(Date.now() + LOAN_DAYS * 86400000);

  const [loan] = await db
    .insert(loansTable)
    .values({
      studentId: studentId ?? null,
      teacherId: teacherId ?? null,
      bookId,
      dueDate: due,
      status: "active",
    })
    .returning();

  await db
    .update(booksTable)
    .set({ availableCopies: book.availableCopies - 1 })
    .where(eq(booksTable.id, bookId));

  res.status(201).json(GetLoanResponse.parse(serializeDates({
    ...loan,
    studentName: studentId ? borrowerName : null,
    teacherName: teacherId ? borrowerName : null,
    borrowerName,
    borrowerType: teacherId ? "teacher" : "student",
  })));
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
      teacherId: loansTable.teacherId,
      bookId: loansTable.bookId,
      checkedOutAt: loansTable.checkedOutAt,
      dueDate: loansTable.dueDate,
      returnedAt: loansTable.returnedAt,
      status: loansTable.status,
      studentName: studentsTable.name,
      teacherName: teachersTable.name,
      bookTitle: booksTable.title,
      bookAuthor: booksTable.author,
    })
    .from(loansTable)
    .leftJoin(studentsTable, eq(loansTable.studentId, studentsTable.id))
    .leftJoin(teachersTable, eq(loansTable.teacherId, teachersTable.id))
    .leftJoin(booksTable, eq(loansTable.bookId, booksTable.id))
    .where(eq(loansTable.id, params.data.id));

  if (!loan) {
    res.status(404).json({ error: "Loan not found" });
    return;
  }
  res.json(GetLoanResponse.parse(serializeDates(buildLoanRow(loan))));
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

  await db
    .update(booksTable)
    .set({ availableCopies: sql`${booksTable.availableCopies} + 1` })
    .where(eq(booksTable.id, existing.bookId));

  if (now > existing.dueDate) {
    const daysLate = Math.ceil((now.getTime() - existing.dueDate.getTime()) / 86400000);
    const amount = (daysLate * FINE_PER_DAY).toFixed(2);
    if (existing.studentId) {
      await db.insert(finesTable).values({
        studentId: existing.studentId,
        teacherId: null,
        loanId: existing.id,
        amount,
        reason: `Late return — ${daysLate} day(s) overdue`,
        paid: false,
      });
    } else if (existing.teacherId) {
      await db.insert(finesTable).values({
        studentId: null,
        teacherId: existing.teacherId,
        loanId: existing.id,
        amount,
        reason: `Late return — ${daysLate} day(s) overdue`,
        paid: false,
      });
      await db.insert(notificationsTable).values({
        teacherId: existing.teacherId,
        studentId: null,
        message: `A fine of ₹${amount} has been issued for the late return of a book (${daysLate} day(s) overdue).`,
        type: "warning",
      });
    }
  }

  const [student] = existing.studentId
    ? await db.select().from(studentsTable).where(eq(studentsTable.id, existing.studentId))
    : [null];
  const [teacher] = existing.teacherId
    ? await db.select().from(teachersTable).where(eq(teachersTable.id, existing.teacherId))
    : [null];
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, loan.bookId));

  const borrowerType = existing.teacherId ? "teacher" : "student";
  const borrowerName = teacher?.name ?? student?.name ?? null;

  res.json(ReturnLoanResponse.parse(serializeDates({
    ...loan,
    studentName: student?.name ?? null,
    teacherName: teacher?.name ?? null,
    borrowerName,
    borrowerType,
    bookTitle: book?.title ?? null,
    bookAuthor: book?.author ?? null,
  })));
});

export default router;
