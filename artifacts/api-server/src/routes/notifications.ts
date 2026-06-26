import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import { serializeDates } from "../lib/serialize";
import * as zod from "zod";

const router: IRouter = Router();

router.get("/notifications", async (req, res): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  // Librarians have no personal notifications
  if (req.session.role === "librarian") {
    res.json([]);
    return;
  }

  const studentRecordId = req.session.studentRecordId;
  if (!studentRecordId) {
    res.status(400).json({ error: "No student record linked" });
    return;
  }

  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.studentId, studentRecordId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  res.json(serializeDates(notifications));
});

router.patch("/notifications/:id/read", async (req, res): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  // Only students own notifications
  const studentRecordId = req.session.studentRecordId;
  if (!studentRecordId) {
    res.status(403).json({ error: "Student access required" });
    return;
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid notification id" });
    return;
  }

  // Scope update to the current student to prevent IDOR
  const [notification] = await db
    .update(notificationsTable)
    .set({ read: true })
    .where(
      and(
        eq(notificationsTable.id, id),
        eq(notificationsTable.studentId, studentRecordId)
      )
    )
    .returning();

  if (!notification) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }
  res.json(serializeDates(notification));
});

router.patch("/notifications/read-all", async (req, res): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const studentRecordId = req.session.studentRecordId;
  if (!studentRecordId) {
    res.json({ updated: 0 });
    return;
  }

  const updated = await db
    .update(notificationsTable)
    .set({ read: true })
    .where(
      and(
        eq(notificationsTable.studentId, studentRecordId),
        eq(notificationsTable.read, false)
      )
    )
    .returning();

  res.json({ updated: updated.length });
});

export default router;
