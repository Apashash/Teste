import { Router, type IRouter } from "express";
import healthRouter from "./health";
import paymentRouter from "./payment";
import logsRouter from "./logs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(paymentRouter);
router.use(logsRouter);

export default router;
