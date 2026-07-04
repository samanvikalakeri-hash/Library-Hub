import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import { serializeDates } from "../lib/serialize";

const router: IRouter = Router();

router.get("/notifications", async (req, res): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  if (req.session.role === "librarian") {
    res.json([]);
    return;
  }

  if (req.session.role === "teacher") {
    const teacherRecordId = req.session.teacherRecordId;
    if (!teacherRecordId) {
      res.status(400).json({ error: "No teacher record linked" });
      return;
    }
    const notifications = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.teacherId, teacherRecordId))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);
    res.json(serializeDates(notifications));
    return;
  }

  // student
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

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid notification id" });
    return;
  }

  let ownerCondition;
  if (req.session.role === "student" && req.session.studentRecordId) {
    ownerCondition = and(eq(notificationsTable.id, id), eq(notificationsTable.studentId, req.session.studentRecordId));
  } else if (req.session.role === "teacher" && req.session.teacherRecordId) {
    ownerCondition = and(eq(notificationsTable.id, id), eq(notificationsTable.teacherId, req.session.teacherRecordId));
  } else {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const [notification] = await db
    .update(notificationsTable)
    .set({ read: true })
    .where(ownerCondition)
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

  let ownerCondition;
  if (req.session.role === "student" && req.session.studentRecordId) {
    ownerCondition = and(eq(notificationsTable.studentId, req.session.studentRecordId), eq(notificationsTable.read, false));
  } else if (req.session.role === "teacher" && req.session.teacherRecordId) {
    ownerCondition = and(eq(notificationsTable.teacherId, req.session.teacherRecordId), eq(notificationsTable.read, false));
  } else {
    res.json({ updated: 0 });
    return;
  }

  const updated = await db
    .update(notificationsTable)
    .set({ read: true })
    .where(ownerCondition)
    .returning();

  res.json({ updated: updated.length });
});

export default router;
