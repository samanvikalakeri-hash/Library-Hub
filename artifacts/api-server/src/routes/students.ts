import { Router, type IRouter } from "express";
import { eq, ilike, and, sql } from "drizzle-orm";
import { db, studentsTable, loansTable, finesTable, booksTable, reservationsTable, notificationsTable } from "@workspace/db";
import {
  ListStudentsQueryParams,
  ListStudentsResponse,
  CreateStudentBody,
  GetStudentParams,
  GetStudentResponse,
  UpdateStudentParams,
  UpdateStudentBody,
  UpdateStudentResponse,
  DeleteStudentParams,
  GetStudentLoansParams,
  GetStudentLoansResponse,
} from "@workspace/api-zod";
import { serializeDates } from "../lib/serialize";

const router: IRouter = Router();

async function enrichStudent(student: typeof studentsTable.$inferSelect) {
  const [activeLoansRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loansTable)
    .where(and(eq(loansTable.studentId, student.id), sql`${loansTable.status} != 'returned'`));
  const [finesRow] = await db
    .select({ total: sql<string>`coalesce(sum(amount),0)` })
    .from(finesTable)
    .where(and(eq(finesTable.studentId, student.id), eq(finesTable.paid, false)));
  return {
    ...student,
    activeLoansCount: activeLoansRow?.count ?? 0,
    totalFinesOwed: parseFloat(finesRow?.total ?? "0"),
  };
}

router.get("/students", async (req, res): Promise<void> => {
  const parsed = ListStudentsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { search, graduationYear } = parsed.data;
  const conditions = [];
  if (search) conditions.push(ilike(studentsTable.name, `%${search}%`));
  if (graduationYear) conditions.push(eq(studentsTable.graduationYear, graduationYear));

  const students = await db
    .select()
    .from(studentsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(studentsTable.name);

  const enriched = await Promise.all(students.map(enrichStudent));
  res.json(ListStudentsResponse.parse(serializeDates(enriched)));
});

router.post("/students", async (req, res): Promise<void> => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { phone, grade, section, rollNumber, ...rest } = parsed.data;
  const [student] = await db
    .insert(studentsTable)
    .values({ ...rest, phone: phone || null, grade: grade || null, section: section || null, rollNumber: rollNumber || null })
    .returning();
  const enriched = await enrichStudent(student);
  res.status(201).json(GetStudentResponse.parse(serializeDates(enriched)));
});

router.get("/students/:id", async (req, res): Promise<void> => {
  const params = GetStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, params.data.id));
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  const enriched = await enrichStudent(student);
  res.json(GetStudentResponse.parse(serializeDates(enriched)));
});

router.patch("/students/:id", async (req, res): Promise<void> => {
  const params = UpdateStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { phone, grade, section, rollNumber, ...rest } = parsed.data;
  const [student] = await db
    .update(studentsTable)
    .set({
      ...rest,
      ...(phone !== undefined ? { phone: phone || null } : {}),
      ...(grade !== undefined ? { grade: grade || null } : {}),
      ...(section !== undefined ? { section: section || null } : {}),
      ...(rollNumber !== undefined ? { rollNumber: rollNumber || null } : {}),
    })
    .where(eq(studentsTable.id, params.data.id))
    .returning();
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  const enriched = await enrichStudent(student);
  res.json(UpdateStudentResponse.parse(serializeDates(enriched)));
});

router.delete("/students/:id", async (req, res): Promise<void> => {
  const params = DeleteStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const studentId = params.data.id;

  // Verify student exists
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId));
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  // Block if student has active (non-returned) loans
  const [activeLoansRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loansTable)
    .where(and(eq(loansTable.studentId, studentId), sql`${loansTable.status} != 'returned'`));
  if ((activeLoansRow?.count ?? 0) > 0) {
    res.status(409).json({ error: `Cannot delete: this student has ${activeLoansRow.count} active loan(s). Collect the book(s) first.` });
    return;
  }

  // Cascade delete in FK order
  await db.delete(finesTable).where(eq(finesTable.studentId, studentId));
  await db.delete(loansTable).where(eq(loansTable.studentId, studentId));
  await db.delete(reservationsTable).where(eq(reservationsTable.studentId, studentId));
  await db.delete(notificationsTable).where(eq(notificationsTable.studentId, studentId));
  await db.delete(studentsTable).where(eq(studentsTable.id, studentId));
  res.sendStatus(204);
});

router.get("/students/:id/loans", async (req, res): Promise<void> => {
  const params = GetStudentLoansParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
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
    .where(eq(loansTable.studentId, params.data.id))
    .orderBy(sql`${loansTable.checkedOutAt} desc`);

  res.json(GetStudentLoansResponse.parse(serializeDates(loans)));
});

export default router;
