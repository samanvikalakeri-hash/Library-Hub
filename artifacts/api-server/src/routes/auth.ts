import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, studentsTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const LIBRARIAN_USERNAME = process.env.LIBRARIAN_USERNAME ?? "librarian";
const LIBRARIAN_PASSWORD = process.env.LIBRARIAN_PASSWORD ?? "library123";
const LIBRARIAN_NAME = "Head Librarian";

declare module "express-session" {
  interface SessionData {
    userId: string;
    role: "librarian" | "student";
    name: string;
    studentRecordId?: number;
  }
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const { role, username, password, studentId } = req.body;

  if (role === "librarian") {
    if (username !== LIBRARIAN_USERNAME || password !== LIBRARIAN_PASSWORD) {
      res.status(401).json({ error: "Invalid librarian credentials" });
      return;
    }
    req.session.userId = "librarian-1";
    req.session.role = "librarian";
    req.session.name = LIBRARIAN_NAME;
    req.session.studentRecordId = undefined;
    logger.info("Librarian logged in");
    res.json({ id: "librarian-1", role: "librarian", name: LIBRARIAN_NAME, studentRecordId: null });
    return;
  }

  if (role === "student") {
    if (!studentId) {
      res.status(400).json({ error: "Student ID is required" });
      return;
    }
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.studentId, studentId));
    if (!student) {
      res.status(401).json({ error: "Student ID not found. Contact your librarian to be registered." });
      return;
    }
    req.session.userId = `student-${student.id}`;
    req.session.role = "student";
    req.session.name = student.name;
    req.session.studentRecordId = student.id;
    logger.info({ studentId: student.id }, "Student logged in");
    res.json({ id: `student-${student.id}`, role: "student", name: student.name, studentRecordId: student.id });
    return;
  }

  res.status(400).json({ error: "Invalid role" });
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/auth/me", (req, res): void => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({
    id: req.session.userId,
    role: req.session.role,
    name: req.session.name,
    studentRecordId: req.session.studentRecordId ?? null,
  });
});

export default router;
