import { Router, type IRouter } from "express";
import { eq, and, isNull, or } from "drizzle-orm";
import { db, finesTable, studentsTable, teachersTable, loansTable, booksTable } from "@workspace/db";
import {
  ListFinesQueryParams,
  ListFinesResponse,
  CreateFineBody,
  CreateFineResponse,
  ClearFineParams,
  ClearFineResponse,
} from "@workspace/api-zod";
import { serializeDates } from "../lib/serialize";

const router: IRouter = Router();

function buildFineRow(f: {
  id: number;
  studentId: number | null;
  teacherId: number | null;
  loanId: number | null;
  amount: string | number;
  reason: string;
  paid: boolean;
  paidAt: Date | null;
  createdAt: Date;
  studentName: string | null;
  teacherName: string | null;
  bookTitle: string | null;
}) {
  const borrowerType = f.teacherId ? "teacher" : "student";
  const borrowerName = f.teacherName ?? f.studentName ?? null;
  return {
    ...f,
    amount: parseFloat(f.amount as string),
    borrowerType,
    borrowerName,
  };
}

router.get("/fines", async (req, res): Promise<void> => {
  const parsed = ListFinesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { studentId, teacherId, paid } = parsed.data;
  const conditions = [];
  if (studentId) conditions.push(eq(finesTable.studentId, studentId));
  if (teacherId) conditions.push(eq(finesTable.teacherId, teacherId));
  if (paid !== undefined) conditions.push(eq(finesTable.paid, paid));

  const fines = await db
    .select({
      id: finesTable.id,
      studentId: finesTable.studentId,
      teacherId: finesTable.teacherId,
      loanId: finesTable.loanId,
      amount: finesTable.amount,
      reason: finesTable.reason,
      paid: finesTable.paid,
      paidAt: finesTable.paidAt,
      createdAt: finesTable.createdAt,
      studentName: studentsTable.name,
      teacherName: teachersTable.name,
      bookTitle: booksTable.title,
    })
    .from(finesTable)
    .leftJoin(studentsTable, eq(finesTable.studentId, studentsTable.id))
    .leftJoin(teachersTable, eq(finesTable.teacherId, teachersTable.id))
    .leftJoin(loansTable, eq(finesTable.loanId, loansTable.id))
    .leftJoin(booksTable, eq(loansTable.bookId, booksTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(finesTable.createdAt);

  res.json(ListFinesResponse.parse(serializeDates(fines.map(buildFineRow))));
});

router.post("/fines", async (req, res): Promise<void> => {
  if (req.session.role !== "librarian") {
    res.status(403).json({ error: "Librarian access required" });
    return;
  }
  const body = CreateFineBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const { studentId, teacherId, amount, reason, collectNow } = body.data;

  if (!studentId && !teacherId) {
    res.status(400).json({ error: "Either studentId or teacherId is required" });
    return;
  }

  let borrowerName: string | null = null;
  let borrowerType: "student" | "teacher" = "student";

  if (studentId) {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId));
    if (!student) {
      res.status(404).json({ error: "Student not found" });
      return;
    }
    borrowerName = student.name;
    borrowerType = "student";
  }

  if (teacherId) {
    const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.id, teacherId));
    if (!teacher) {
      res.status(404).json({ error: "Teacher not found" });
      return;
    }
    borrowerName = teacher.name;
    borrowerType = "teacher";
  }

  const now = new Date();
  const [fine] = await db
    .insert(finesTable)
    .values({
      studentId: studentId ?? null,
      teacherId: teacherId ?? null,
      loanId: null,
      amount: amount.toFixed(2),
      reason,
      paid: collectNow ?? false,
      paidAt: collectNow ? now : null,
    })
    .returning();

  res.status(201).json(
    CreateFineResponse.parse(
      serializeDates({
        ...fine,
        amount: parseFloat(fine.amount as string),
        studentName: borrowerType === "student" ? borrowerName : null,
        teacherName: borrowerType === "teacher" ? borrowerName : null,
        borrowerName,
        borrowerType,
        bookTitle: null,
      })
    )
  );
});

router.post("/fines/:id/clear", async (req, res): Promise<void> => {
  if (req.session.role !== "librarian") {
    res.status(403).json({ error: "Librarian access required" });
    return;
  }
  const params = ClearFineParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [fine] = await db
    .update(finesTable)
    .set({ paid: true, paidAt: new Date() })
    .where(eq(finesTable.id, params.data.id))
    .returning();
  if (!fine) {
    res.status(404).json({ error: "Fine not found" });
    return;
  }

  const [student] = fine.studentId
    ? await db.select().from(studentsTable).where(eq(studentsTable.id, fine.studentId))
    : [null];
  const [teacher] = fine.teacherId
    ? await db.select().from(teachersTable).where(eq(teachersTable.id, fine.teacherId))
    : [null];

  const bookRows = fine.loanId
    ? await db
        .select({ title: booksTable.title })
        .from(loansTable)
        .leftJoin(booksTable, eq(loansTable.bookId, booksTable.id))
        .where(eq(loansTable.id, fine.loanId))
    : [];
  const bookTitle = bookRows[0]?.title ?? null;

  const borrowerType = fine.teacherId ? "teacher" : "student";
  const borrowerName = teacher?.name ?? student?.name ?? null;

  res.json(ClearFineResponse.parse(serializeDates({
    ...fine,
    amount: parseFloat(fine.amount as string),
    studentName: student?.name ?? null,
    teacherName: teacher?.name ?? null,
    borrowerName,
    borrowerType,
    bookTitle,
  })));
});

export default router;
