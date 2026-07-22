import { Router, type IRouter } from "express";
import { eq, ilike, and, sql } from "drizzle-orm";
import { db, teachersTable, loansTable, booksTable, studentsTable, finesTable, notificationsTable } from "@workspace/db";
import {
  ListTeachersQueryParams,
  ListTeachersResponse,
  CreateTeacherBody,
  GetTeacherParams,
  GetTeacherResponse,
  UpdateTeacherParams,
  UpdateTeacherBody,
  UpdateTeacherResponse,
  DeleteTeacherParams,
  GetTeacherLoansParams,
  GetStudentLoansResponse,
} from "@workspace/api-zod";
import { serializeDates } from "../lib/serialize";

const router: IRouter = Router();

async function enrichTeacher(teacher: typeof teachersTable.$inferSelect) {
  const [activeLoansRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loansTable)
    .where(and(eq(loansTable.teacherId, teacher.id), sql`${loansTable.status} != 'returned'`));
  return {
    ...teacher,
    activeLoansCount: activeLoansRow?.count ?? 0,
  };
}

router.get("/teachers", async (req, res): Promise<void> => {
  const parsed = ListTeachersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { search } = parsed.data;
  const conditions = [];
  if (search) conditions.push(ilike(teachersTable.name, `%${search}%`));

  const teachers = await db
    .select()
    .from(teachersTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(teachersTable.name);

  const enriched = await Promise.all(teachers.map(enrichTeacher));
  res.json(ListTeachersResponse.parse(serializeDates(enriched)));
});

router.post("/teachers", async (req, res): Promise<void> => {
  const parsed = CreateTeacherBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { phone, subject, ...rest } = parsed.data;
  const [teacher] = await db
    .insert(teachersTable)
    .values({ ...rest, phone: phone || null, subject: subject || null })
    .returning();
  const enriched = await enrichTeacher(teacher);
  res.status(201).json(GetTeacherResponse.parse(serializeDates(enriched)));
});

router.get("/teachers/:id", async (req, res): Promise<void> => {
  const params = GetTeacherParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.id, params.data.id));
  if (!teacher) {
    res.status(404).json({ error: "Teacher not found" });
    return;
  }
  const enriched = await enrichTeacher(teacher);
  res.json(GetTeacherResponse.parse(serializeDates(enriched)));
});

router.patch("/teachers/:id", async (req, res): Promise<void> => {
  const params = UpdateTeacherParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTeacherBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { phone, subject, ...rest } = parsed.data;
  const [teacher] = await db
    .update(teachersTable)
    .set({
      ...rest,
      ...(phone !== undefined ? { phone: phone || null } : {}),
      ...(subject !== undefined ? { subject: subject || null } : {}),
    })
    .where(eq(teachersTable.id, params.data.id))
    .returning();
  if (!teacher) {
    res.status(404).json({ error: "Teacher not found" });
    return;
  }
  const enriched = await enrichTeacher(teacher);
  res.json(UpdateTeacherResponse.parse(serializeDates(enriched)));
});

router.delete("/teachers/:id", async (req, res): Promise<void> => {
  const params = DeleteTeacherParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const teacherId = params.data.id;

  // Verify teacher exists
  const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.id, teacherId));
  if (!teacher) {
    res.status(404).json({ error: "Teacher not found" });
    return;
  }

  // Block if teacher has active (non-returned) loans
  const [activeLoansRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loansTable)
    .where(and(eq(loansTable.teacherId, teacherId), sql`${loansTable.status} != 'returned'`));
  if ((activeLoansRow?.count ?? 0) > 0) {
    res.status(409).json({ error: `Cannot delete: this teacher has ${activeLoansRow.count} active loan(s). Collect the book(s) first.` });
    return;
  }

  // Cascade delete in FK order
  await db.delete(finesTable).where(eq(finesTable.teacherId, teacherId));
  await db.delete(loansTable).where(eq(loansTable.teacherId, teacherId));
  await db.delete(notificationsTable).where(eq(notificationsTable.teacherId, teacherId));
  await db.delete(teachersTable).where(eq(teachersTable.id, teacherId));
  res.sendStatus(204);
});

router.get("/teachers/:id/loans", async (req, res): Promise<void> => {
  const params = GetTeacherLoansParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
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
      bookTitle: booksTable.title,
      bookAuthor: booksTable.author,
    })
    .from(loansTable)
    .leftJoin(studentsTable, eq(loansTable.studentId, studentsTable.id))
    .leftJoin(booksTable, eq(loansTable.bookId, booksTable.id))
    .where(eq(loansTable.teacherId, params.data.id))
    .orderBy(sql`${loansTable.checkedOutAt} desc`);

  const enriched = loans.map(l => ({
    ...l,
    borrowerName: l.studentName,
    borrowerType: "teacher" as const,
  }));

  res.json(GetStudentLoansResponse.parse(serializeDates(enriched)));
});

export default router;
