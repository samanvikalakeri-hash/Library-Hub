import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, reservationsTable, studentsTable, booksTable, notificationsTable } from "@workspace/db";
import {
  ListReservationsQueryParams,
  ListReservationsResponse,
  CreateReservationBody,
  UpdateReservationParams,
  UpdateReservationBody,
  UpdateReservationResponse,
  DeleteReservationParams,
} from "@workspace/api-zod";
import { serializeDates } from "../lib/serialize";

const router: IRouter = Router();

router.get("/reservations", async (req, res): Promise<void> => {
  const parsed = ListReservationsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { studentId, status } = parsed.data;
  const conditions = [];
  if (studentId) conditions.push(eq(reservationsTable.studentId, studentId));
  if (status) conditions.push(eq(reservationsTable.status, status));

  const reservations = await db
    .select({
      id: reservationsTable.id,
      studentId: reservationsTable.studentId,
      bookId: reservationsTable.bookId,
      status: reservationsTable.status,
      createdAt: reservationsTable.createdAt,
      studentName: studentsTable.name,
      bookTitle: booksTable.title,
      bookAuthor: booksTable.author,
    })
    .from(reservationsTable)
    .leftJoin(studentsTable, eq(reservationsTable.studentId, studentsTable.id))
    .leftJoin(booksTable, eq(reservationsTable.bookId, booksTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(reservationsTable.createdAt);

  res.json(ListReservationsResponse.parse(serializeDates(reservations)));
});

router.post("/reservations", async (req, res): Promise<void> => {
  const parsed = CreateReservationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [reservation] = await db.insert(reservationsTable).values(parsed.data).returning();
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, reservation.studentId));
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, reservation.bookId));
  res.status(201).json(serializeDates({
    ...reservation,
    studentName: student?.name,
    bookTitle: book?.title,
    bookAuthor: book?.author,
  }));
});

router.patch("/reservations/:id", async (req, res): Promise<void> => {
  const params = UpdateReservationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateReservationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [reservation] = await db
    .update(reservationsTable)
    .set(parsed.data)
    .where(eq(reservationsTable.id, params.data.id))
    .returning();
  if (!reservation) {
    res.status(404).json({ error: "Reservation not found" });
    return;
  }
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, reservation.studentId));
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, reservation.bookId));

  // Send notification to student when reservation is fulfilled or denied
  if (parsed.data.status === "fulfilled") {
    await db.insert(notificationsTable).values({
      studentId: reservation.studentId,
      message: `Your reservation for "${book?.title ?? "a book"}" has been approved! Please visit the library to pick it up.`,
      type: "success",
      read: false,
    });
  } else if (parsed.data.status === "cancelled") {
    await db.insert(notificationsTable).values({
      studentId: reservation.studentId,
      message: `Your reservation for "${book?.title ?? "a book"}" was not fulfilled. Please contact the library for more information.`,
      type: "warning",
      read: false,
    });
  }

  res.json(UpdateReservationResponse.parse(serializeDates({
    ...reservation,
    studentName: student?.name,
    bookTitle: book?.title,
    bookAuthor: book?.author,
  })));
});

router.delete("/reservations/:id", async (req, res): Promise<void> => {
  const params = DeleteReservationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [reservation] = await db.delete(reservationsTable).where(eq(reservationsTable.id, params.data.id)).returning();
  if (!reservation) {
    res.status(404).json({ error: "Reservation not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
