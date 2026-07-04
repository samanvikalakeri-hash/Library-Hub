import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import booksRouter from "./books";
import studentsRouter from "./students";
import teachersRouter from "./teachers";
import loansRouter from "./loans";
import reservationsRouter from "./reservations";
import finesRouter from "./fines";
import dashboardRouter from "./dashboard";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(booksRouter);
router.use(studentsRouter);
router.use(teachersRouter);
router.use(loansRouter);
router.use(reservationsRouter);
router.use(finesRouter);
router.use(dashboardRouter);
router.use(notificationsRouter);

export default router;
