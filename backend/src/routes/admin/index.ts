import { Router } from "express";
import { authRouter } from "./auth";
import { availabilityBlocksRouter } from "./availability-blocks";
import { contentRouter } from "./content";
import { miscRouter } from "./misc";
import { quotesRouter } from "./quotes";

const adminRouter = Router();

adminRouter.use("/auth", authRouter);
adminRouter.use("/quotes", quotesRouter);
adminRouter.use(contentRouter);
adminRouter.use("/availability/blocks", availabilityBlocksRouter);
adminRouter.use(miscRouter);

export { adminRouter };
