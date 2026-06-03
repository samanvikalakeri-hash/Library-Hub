import { Router, type IRouter } from "express";
import healthRouter from "./health";
import booksRouter from "./books";
import studentsRouter from "./students";
import loansRouter from "./loans";
import reservationsRouter from "./reservations";
import finesRouter from "./fines";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(booksRouter);
router.use(studentsRouter);
router.use(loansRouter);
router.use(reservationsRouter);
router.use(finesRouter);
router.use(dashboardRouter);

export default router;
