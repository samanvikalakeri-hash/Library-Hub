import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, finesTable, studentsTable, loansTable, booksTable } from "@workspace/db";
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

router.get("/fines", async (req, res): Promise<void> => {
  const parsed = ListFinesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { studentId, paid } = parsed.data;
  const conditions = [];
  if (studentId) conditions.push(eq(finesTable.studentId, studentId));
  if (paid !== undefined) conditions.push(eq(finesTable.paid, paid));

  const fines = await db
    .select({
      id: finesTable.id,
      studentId: finesTable.studentId,
      loanId: finesTable.loanId,
      amount: finesTable.amount,
      reason: finesTable.reason,
      paid: finesTable.paid,
      paidAt: finesTable.paidAt,
      createdAt: finesTable.createdAt,
      studentName: studentsTable.name,
      bookTitle: booksTable.title,
    })
    .from(finesTable)
    .leftJoin(studentsTable, eq(finesTable.studentId, studentsTable.id))
    .leftJoin(loansTable, eq(finesTable.loanId, loansTable.id))
    .leftJoin(booksTable, eq(loansTable.bookId, booksTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(finesTable.createdAt);

  const mapped = fines.map((f) => ({ ...f, amount: parseFloat(f.amount as string) }));
  res.json(ListFinesResponse.parse(serializeDates(mapped)));
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
  const { studentId, amount, reason, collectNow } = body.data;

  // Verify student exists
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId));
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const now = new Date();
  const [fine] = await db
    .insert(finesTable)
    .values({
      studentId,
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
        studentName: student.name,
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
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, fine.studentId));
  const bookRows = fine.loanId
    ? await db
        .select({ title: booksTable.title })
        .from(loansTable)
        .leftJoin(booksTable, eq(loansTable.bookId, booksTable.id))
        .where(eq(loansTable.id, fine.loanId))
    : [];
  const bookTitle = bookRows[0]?.title ?? null;
  res.json(ClearFineResponse.parse(serializeDates({
    ...fine,
    amount: parseFloat(fine.amount as string),
    studentName: student?.name ?? null,
    bookTitle,
  })));
});

export default router;
