import { Router, type IRouter } from "express";
import { eq, ilike, and, sql, inArray } from "drizzle-orm";
import { db, booksTable, loansTable, reservationsTable, finesTable } from "@workspace/db";
import {
  ListBooksQueryParams,
  ListBooksResponse,
  CreateBookBody,
  GetBookParams,
  GetBookResponse,
  UpdateBookParams,
  UpdateBookBody,
  UpdateBookResponse,
  DeleteBookParams,
} from "@workspace/api-zod";
import { serializeDates } from "../lib/serialize";

const router: IRouter = Router();

router.get("/books", async (req, res): Promise<void> => {
  const parsed = ListBooksQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { search, genre, available } = parsed.data;

  const conditions = [];
  if (search) {
    conditions.push(
      sql`(${ilike(booksTable.title, `%${search}%`)} OR ${ilike(booksTable.author, `%${search}%`)})`
    );
  }
  if (genre) conditions.push(eq(booksTable.genre, genre));
  if (available === true) conditions.push(sql`${booksTable.availableCopies} > 0`);
  if (available === false) conditions.push(eq(booksTable.availableCopies, 0));

  const books = await db
    .select()
    .from(booksTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(booksTable.title);

  res.json(ListBooksResponse.parse(serializeDates(books)));
});

router.post("/books", async (req, res): Promise<void> => {
  const parsed = CreateBookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { totalCopies = 1, description, publisher, ...rest } = parsed.data;
  const [book] = await db
    .insert(booksTable)
    .values({
      ...rest,
      totalCopies,
      availableCopies: totalCopies,
      description: description || null,
      publisher: publisher || null,
    })
    .returning();
  res.status(201).json(GetBookResponse.parse(serializeDates(book)));
});

router.get("/books/:id", async (req, res): Promise<void> => {
  const params = GetBookParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, params.data.id));
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }
  res.json(GetBookResponse.parse(serializeDates(book)));
});

router.patch("/books/:id", async (req, res): Promise<void> => {
  const params = UpdateBookParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateBookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const existing = await db.select().from(booksTable).where(eq(booksTable.id, params.data.id));
  if (!existing[0]) {
    res.status(404).json({ error: "Book not found" });
    return;
  }
  const updates: Partial<typeof booksTable.$inferInsert> = { ...parsed.data };
  if (parsed.data.totalCopies !== undefined) {
    const diff = parsed.data.totalCopies - existing[0].totalCopies;
    updates.availableCopies = Math.max(0, existing[0].availableCopies + diff);
  }
  const [book] = await db
    .update(booksTable)
    .set(updates)
    .where(eq(booksTable.id, params.data.id))
    .returning();
  res.json(UpdateBookResponse.parse(serializeDates(book)));
});

router.delete("/books/:id", async (req, res): Promise<void> => {
  const params = DeleteBookParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const bookId = params.data.id;

  const [existing] = await db.select().from(booksTable).where(eq(booksTable.id, bookId));
  if (!existing) {
    res.status(404).json({ error: "Book not found" });
    return;
  }

  const activeLoans = await db
    .select({ id: loansTable.id })
    .from(loansTable)
    .where(and(eq(loansTable.bookId, bookId), inArray(loansTable.status, ["active", "overdue"])));
  if (activeLoans.length > 0) {
    res.status(409).json({
      error: `Cannot delete: this book has ${activeLoans.length} active loan(s). Return the book(s) first.`,
    });
    return;
  }

  const pendingReservations = await db
    .select({ id: reservationsTable.id })
    .from(reservationsTable)
    .where(and(eq(reservationsTable.bookId, bookId), eq(reservationsTable.status, "pending")));
  if (pendingReservations.length > 0) {
    res.status(409).json({
      error: `Cannot delete: this book has ${pendingReservations.length} pending reservation(s). Cancel them first.`,
    });
    return;
  }

  const bookLoans = await db
    .select({ id: loansTable.id })
    .from(loansTable)
    .where(eq(loansTable.bookId, bookId));
  if (bookLoans.length > 0) {
    const loanIds = bookLoans.map((l) => l.id);
    await db.delete(finesTable).where(inArray(finesTable.loanId, loanIds));
    await db.delete(loansTable).where(eq(loansTable.bookId, bookId));
  }

  await db.delete(reservationsTable).where(eq(reservationsTable.bookId, bookId));
  await db.delete(booksTable).where(eq(booksTable.id, bookId));

  res.sendStatus(204);
});

export default router;
