import { Router } from "express";
import { z } from "zod";
import { estimateRental } from "../services/pricing";

const pricingRouter = Router();

const estimateSchema = z.object({
  vehicleSlug: z.string().min(1).max(100),
  pickupAt: z.string().datetime({ offset: true }),
  returnAt: z.string().datetime({ offset: true }),
  pickupLocationSlug: z.string().min(1).max(100),
  returnLocationSlug: z.string().min(1).max(100),
  extras: z.array(
    z.object({
      extraId: z.string().min(1).max(100),
      quantity: z.number().int().min(1).max(10),
      childAge: z.number().int().min(0).max(17).optional(),
      childWeightKg: z.number().positive().max(100).optional(),
    }).strict(),
  ).max(20).default([]),
}).strict().superRefine((request, context) => {
  const pickupAt = new Date(request.pickupAt);
  const returnAt = new Date(request.returnAt);
  if (returnAt <= pickupAt) {
    context.addIssue({
      code: "custom",
      path: ["returnAt"],
      message: "Return date must be after pickup date",
    });
  }
  const extraIds = request.extras.map((extra) => extra.extraId);
  if (new Set(extraIds).size !== extraIds.length) {
    context.addIssue({
      code: "custom",
      path: ["extras"],
      message: "Each extra may only be specified once",
    });
  }
});

pricingRouter.post("/pricing/estimate", async (request, response) => {
  const input = estimateSchema.parse(request.body);
  const estimate = await estimateRental({
    ...input,
    pickupAt: new Date(input.pickupAt),
    returnAt: new Date(input.returnAt),
  });
  const lang = z.enum(["en", "el"]).default("en").parse(request.query.lang);
  response.json({
    success: true,
    data: lang === "en"
      ? estimate
      : {
          ...estimate,
          lines: estimate.lines.map((line) => ({
            ...line,
            description: line.description.el,
          })),
          included: estimate.included.el,
          warnings: estimate.warnings.map((item) => ({
            code: item.code,
            message: item.message.el,
          })),
        },
    meta: { lang },
  });
});

export { pricingRouter };
