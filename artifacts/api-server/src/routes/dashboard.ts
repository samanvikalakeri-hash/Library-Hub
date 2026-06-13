import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, booksTable, studentsTable, loansTable, finesTable, reservationsTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetOverdueLoansResponse,
  GetDueSoonLoansResponse,
  GetPopularBooksResponse,
  GetGenreStatsResponse,
} from "@workspace/api-zod";
import { serializeDates } from "../lib/serialize";

const router: IRouter = Router();

async function markOverdue() {
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

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  await markOverdue();
  const [[totalBooks], [totalStudents], [activeLoans], [overdueLoans], [finesOwed], [booksAvail], [resPending]] =
    await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(booksTable),
      db.select({ count: sql<number>`count(*)::int` }).from(studentsTable),
      db.select({ count: sql<number>`count(*)::int` }).from(loansTable).where(eq(loansTable.status, "active")),
      db.select({ count: sql<number>`count(*)::int` }).from(loansTable).where(eq(loansTable.status, "overdue")),
      db.select({ total: sql<string>`coalesce(sum(amount),0)` }).from(finesTable).where(eq(finesTable.paid, false)),
      db.select({ count: sql<number>`coalesce(sum(available_copies),0)::int` }).from(booksTable),
      db.select({ count: sql<number>`count(*)::int` }).from(reservationsTable).where(eq(reservationsTable.status, "pending")),
    ]);

  res.json(
    GetDashboardSummaryResponse.parse({
      totalBooks: totalBooks?.count ?? 0,
      totalStudents: totalStudents?.count ?? 0,
      activeLoans: activeLoans?.count ?? 0,
      overdueLoans: overdueLoans?.count ?? 0,
      totalFinesOwed: parseFloat(finesOwed?.total ?? "0"),
      booksAvailable: booksAvail?.count ?? 0,
      reservationsPending: resPending?.count ?? 0,
    })
  );
});

router.get("/dashboard/overdue", async (_req, res): Promise<void> => {
  await markOverdue();
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
    .where(eq(loansTable.status, "overdue"))
    .orderBy(loansTable.dueDate);
  res.json(GetOverdueLoansResponse.parse(serializeDates(loans)));
});

router.get("/dashboard/due-soon", async (_req, res): Promise<void> => {
  const threeDays = new Date(Date.now() + 3 * 86400000);
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
    .where(
      and(
        eq(loansTable.status, "active"),
        sql`${loansTable.dueDate} <= ${threeDays}`,
        sql`${loansTable.dueDate} >= now()`
      )
    )
    .orderBy(loansTable.dueDate);
  res.json(GetDueSoonLoansResponse.parse(serializeDates(loans)));
});

router.get("/dashboard/popular-books", async (_req, res): Promise<void> => {
  const popular = await db
    .select({
      bookId: booksTable.id,
      title: booksTable.title,
      author: booksTable.author,
      loanCount: sql<number>`count(${loansTable.id})::int`,
    })
    .from(loansTable)
    .leftJoin(booksTable, eq(loansTable.bookId, booksTable.id))
    .groupBy(booksTable.id, booksTable.title, booksTable.author)
    .orderBy(sql`count(${loansTable.id}) desc`)
    .limit(10);
  res.json(GetPopularBooksResponse.parse(serializeDates(popular)));
});

router.get("/dashboard/genre-stats", async (_req, res): Promise<void> => {
  const stats = await db
    .select({
      genre: booksTable.genre,
      loanCount: sql<number>`count(${loansTable.id})::int`,
    })
    .from(loansTable)
    .leftJoin(booksTable, eq(loansTable.bookId, booksTable.id))
    .groupBy(booksTable.genre)
    .orderBy(sql`count(${loansTable.id}) desc`);
  res.json(GetGenreStatsResponse.parse(serializeDates(stats)));
});

export default router;
