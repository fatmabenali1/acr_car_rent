import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { resolve } from "node:path";
import swaggerUi from "swagger-ui-express";
import { corsOrigins, env } from "./config/env";
import { prisma } from "./db";
import { AppError, errorHandler } from "./middleware/errors";
import { adminRouter } from "./routes/admin";
import { contactRouter } from "./routes/contact";
import { inquiriesRouter } from "./routes/inquiries";
import { reservationsRouter } from "./routes/reservations";
import { availabilityRouter } from "./routes/availability";
import { checkoutRouter, stripeWebhookRouter } from "./routes/checkout";
import { paymentsRouter } from "./routes/payments";
import { pricingRouter } from "./routes/pricing";
import { publicRouter } from "./routes/public";
import { quotesRouter } from "./routes/quotes";

const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    const isAllowed = corsOrigins.includes("*") || corsOrigins.includes(origin);
    if (isAllowed) {
      callback(null, true);
      return;
    }

    callback(new AppError(403, "CORS_ORIGIN_NOT_ALLOWED", "Origin is not allowed"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "Accept-Language", "X-Requested-With", "Idempotency-Key"],
}));
app.use("/api", stripeWebhookRouter);
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }));

app.get("/health", async (_request, response, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.json({
      success: true,
      data: { status: "ok" },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    next(error);
  }
});

const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Athens Car Rental API",
    version: "1.0.0",
    description: "REST API for Athens Car Rental (ACR).",
  },
  servers: [{ url: "/api/v1" }],
  components: {
    securitySchemes: {
      AdminBearer: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      DriverEligibility: {
        type: "object",
        required: ["age", "licenceYears", "countryCode"],
        properties: {
          age: { type: "integer", minimum: 18, maximum: 100 },
          licenceYears: { type: "integer", minimum: 0, maximum: 80 },
          countryCode: { type: "string", minLength: 2, maxLength: 2, example: "GR" },
          hasInternationalPermit: { type: "boolean", default: false },
        },
      },
    },
  },
  paths: {
    "/cookie-consent": {
      get: { summary: "Get the browser's saved cookie consent choice" },
      put: {
        summary: "Save or update the browser's cookie consent choice",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["choice"],
                properties: {
                  choice: { type: "string", enum: ["accepted", "refused", "customized"] },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Cookie preference saved" }, "400": { description: "Invalid consent choice" } },
      },
    },
    "/home": { get: { summary: "Homepage slides, banners and selling points" } },
    "/vehicles": { get: { summary: "List vehicle categories with filters and pagination" } },
    "/vehicles/{slug}": { get: { summary: "Get a vehicle category" } },
    "/vehicle-groups": { get: { summary: "List vehicle groups" } },
    "/locations": { get: { summary: "List rental locations" } },
    "/locations/{slug}": { get: { summary: "Get a rental location" } },
    "/extras": { get: { summary: "List optional extras" } },
    "/rental-info": { get: { summary: "Rental terms and conditions" } },
    "/faq": { get: { summary: "Frequently asked questions" } },
    "/offers": { get: { summary: "Current offers" } },
    "/reviews": { get: { summary: "Customer reviews" } },
    "/pages/{slug}": { get: { summary: "Get a published CMS page" } },
    "/contact-info": { get: { summary: "Company contact information" } },
    "/contact": {
      post: {
        summary: "Submit a contact message and queue a bilingual acknowledgement",
        parameters: [{
          name: "lang",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["en", "el"] },
        }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "phone", "subject", "message", "recaptchaToken"],
                properties: {
                  name: { type: "string", maxLength: 120 },
                  email: { type: "string", format: "email" },
                  phone: { type: "string", minLength: 5, maxLength: 30 },
                  subject: { type: "string", maxLength: 200 },
                  message: { type: "string", maxLength: 4000 },
                  language: { type: "string", enum: ["en", "el"], default: "en" },
                  recaptchaToken: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "202": { description: "Message stored and customer acknowledgement queued" },
          "400": { description: "Invalid request or reCAPTCHA rejection" },
          "503": { description: "reCAPTCHA verification is unavailable or not configured" },
        },
      },
    },
    "/pricing/estimate": {
      post: {
        summary: "Estimate rental costs using configured rates",
        parameters: [{
          name: "lang",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["en", "el"], default: "en" },
        }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["vehicleSlug", "pickupAt", "returnAt", "pickupLocationSlug", "returnLocationSlug"],
                properties: {
                  vehicleSlug: { type: "string", example: "standard-b" },
                  pickupAt: { type: "string", format: "date-time" },
                  returnAt: { type: "string", format: "date-time" },
                  pickupLocationSlug: { type: "string", example: "athens-international-airport" },
                  returnLocationSlug: { type: "string", example: "athens-international-airport" },
                  extras: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["extraId", "quantity"],
                      properties: {
                        extraId: { type: "string" },
                        quantity: { type: "integer", minimum: 1, maximum: 10 },
                        childAge: { type: "integer", minimum: 0, maximum: 17 },
                        childWeightKg: { type: "number", exclusiveMinimum: 0, maximum: 100 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Estimate; totalEur is null when any required rate is not configured" },
          "400": { description: "Invalid request or rental policy constraint" },
          "404": { description: "Vehicle category, location, or extra not found" },
        },
      },
    },
    "/quotes": {
      post: {
        summary: "Submit a quote request; does not create an instant booking",
        parameters: [{
          name: "lang",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["en", "el"], default: "en" },
        }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: [
                  "vehicleSlug", "pickupLocationSlug", "returnLocationSlug", "pickupAt", "returnAt",
                  "customer", "driver", "language", "recaptchaToken",
                ],
                properties: {
                  vehicleSlug: { type: "string" },
                  pickupLocationSlug: { type: "string" },
                  returnLocationSlug: { type: "string" },
                  pickupAt: { type: "string", format: "date-time" },
                  returnAt: { type: "string", format: "date-time" },
                  flightNumber: { type: "string" },
                  customer: {
                    type: "object",
                    required: ["firstName", "lastName", "email", "phone", "country"],
                    properties: {
                      firstName: { type: "string" },
                      lastName: { type: "string" },
                      email: { type: "string", format: "email" },
                      phone: { type: "string" },
                      country: { type: "string", minLength: 2, maxLength: 2, example: "GR" },
                    },
                  },
                  driver: { $ref: "#/components/schemas/DriverEligibility" },
                  additionalDrivers: {
                    type: "array",
                    maxItems: 5,
                    items: { $ref: "#/components/schemas/DriverEligibility" },
                  },
                  extras: { type: "array", items: { type: "object" } },
                  notes: { type: "string", maxLength: 2000 },
                  language: { type: "string", enum: ["en", "el"] },
                  recaptchaToken: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "202": { description: "Quote request accepted; acknowledgement and agency notification are queued" },
          "400": { description: "Invalid request, reCAPTCHA rejection, or rental policy violation" },
          "503": { description: "reCAPTCHA verification is unavailable or not configured" },
        },
      },
    },
    "/reservations": {
      post: {
        summary: "Create a reservation request with a server-calculated placeholder quote",
        servers: [{ url: "/api", description: "Reservation and checkout API" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: [
                  "carId", "pickupLocation", "returnLocation", "pickupAt", "returnAt",
                  "driverAge", "driverLicenceYears", "firstName", "lastName", "email",
                  "phone", "country", "privacyAccepted",
                ],
                properties: {
                  carId: { type: "string", example: "D1" },
                  pickupLocation: { type: "string", maxLength: 300 },
                  returnLocation: { type: "string", maxLength: 300 },
                  pickupAt: { type: "string", format: "date-time" },
                  returnAt: { type: "string", format: "date-time" },
                  driverAge: { type: "integer", minimum: 23, maximum: 75 },
                  driverLicenceYears: { type: "integer", minimum: 1, maximum: 80 },
                  firstName: { type: "string", maxLength: 100 },
                  lastName: { type: "string", maxLength: 100 },
                  email: { type: "string", format: "email" },
                  phone: { type: "string", maxLength: 30 },
                  country: { type: "string", maxLength: 100 },
                  coupon: { type: "string", maxLength: 80 },
                  notes: { type: "string", maxLength: 2000 },
                  language: { type: "string", enum: ["en", "el"] },
                  privacyAccepted: { type: "boolean", enum: [true] },
                  website: { type: "string", maxLength: 500, description: "Honeypot; must be empty" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Reservation reference, server total/deposit, and emailSent status" },
          "400": { description: "Field-level validation error" },
          "429": { description: "Reservation request rate limit exceeded" },
        },
      },
    },
    "/reservations/{reference}/payment-info": {
      get: {
        summary: "Get the minimum customer and deposit fields needed to pre-fill payment",
        servers: [{ url: "/api", description: "Reservation and checkout API" }],
        parameters: [{
          name: "reference",
          in: "path",
          required: true,
          schema: { type: "string", pattern: "^\\d{4}[A-Z]{2}$" },
        }],
        responses: {
          "200": { description: "Reservation payment form prefill fields only" },
          "404": { description: "Reservation not found" },
          "429": { description: "Payment info lookup rate limit exceeded" },
        },
      },
    },
    "/quotes/{reference}": {
      get: {
        summary: "Check quote status using its reference and customer email",
        parameters: [
          { name: "reference", in: "path", required: true, schema: { type: "string", pattern: "^\\d{4}[A-Z]{2}$" } },
          { name: "email", in: "query", required: true, schema: { type: "string", format: "email" } },
        ],
        responses: {
          "200": { description: "Quote status and notification delivery status" },
          "404": { description: "Quote not found" },
        },
      },
    },
    "/payments/init": {
      post: {
        summary: "Initiate a deposit payment for a quote; no instant booking is created",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: [
                  "firstName", "lastName", "email", "country", "state", "city", "zipcode",
                  "address", "mobile", "amount", "reservationReference", "deliveryDate",
                  "acceptedTerms", "recaptchaToken",
                ],
                properties: {
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  email: { type: "string", format: "email" },
                  country: { type: "string" },
                  state: { type: "string" },
                  city: { type: "string" },
                  zipcode: { type: "string" },
                  address: { type: "string" },
                  mobile: { type: "string", pattern: "^\\\\+?[0-9]{7,15}$" },
                  amount: { type: "number", minimum: 50, example: 100 },
                  reservationReference: { type: "string", pattern: "^\\\\d{4}[A-Z]{2}$", example: "0203AC" },
                  deliveryDate: { type: "string", pattern: "^\\\\d{1,2}/\\\\d{1,2}/\\\\d{4}$", example: "12/7/2026" },
                  notes: { type: "string" },
                  acceptedTerms: { type: "boolean", enum: [true] },
                  recaptchaToken: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Hosted payment session and redirect parameters" },
          "404": { description: "Reservation reference not found" },
          "409": { description: "Quote is not payable, cancelled, or expired" },
          "422": { description: "Terms were not accepted or amount is outside allowed limits" },
        },
      },
    },
    "/payments/callback": {
      post: {
        summary: "Receive and verify an idempotent payment-provider callback",
        responses: {
          "200": { description: "Callback accepted; duplicates have no additional effect" },
          "400": { description: "Callback signature or payload is invalid" },
        },
      },
    },
    "/payments/{id}/status": {
      get: {
        summary: "Get payment status and category-specific CDW/cancellation reminders",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Payment status and policy reminders" },
          "404": { description: "Payment not found" },
        },
      },
    },
    "/payments/mock-checkout/{id}": {
      get: { summary: "Development-only mock hosted-checkout page" },
      post: { summary: "Development-only simulation of mock payment outcomes" },
    },
    "/availability/check": {
      post: {
        summary: "Check category availability and return location-policy warnings",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["categoryId", "pickupAt", "dropoffAt"],
                properties: {
                  categoryId: { type: "string" },
                  pickupAt: { type: "string", format: "date-time" },
                  dropoffAt: { type: "string", format: "date-time" },
                  pickupLocationId: { type: "string" },
                  returnLocationId: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Availability and bilingual warnings" },
          "400": { description: "Invalid rental dates" },
          "404": { description: "Category or location not found" },
        },
      },
    },
    "/admin/auth/login": {
      post: {
        summary: "Exchange administrator email and password for access and refresh JWTs",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", format: "password" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "JWT token pair" }, "401": { description: "Invalid credentials" }, "429": { description: "Login rate limit exceeded" } },
      },
    },
    "/admin/auth/refresh": {
      post: { summary: "Rotate a refresh JWT and issue a new access JWT", responses: { "200": { description: "Rotated JWT token pair" }, "401": { description: "Invalid or reused refresh token" } } },
    },
    "/admin/auth/logout": {
      post: { summary: "Revoke a refresh JWT", responses: { "200": { description: "Refresh token revoked" } } },
    },
    "/admin/auth/me": {
      get: { summary: "Get the current administrator", security: [{ AdminBearer: [] }], responses: { "200": { description: "Administrator identity" }, "401": { description: "Missing or invalid access token" } } },
    },
    "/admin/vehicles": {
      get: { summary: "List vehicle categories (ADMIN)", security: [{ AdminBearer: [] }] },
      post: { summary: "Create a vehicle category (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/vehicles/{id}": {
      get: { summary: "Get a vehicle category (ADMIN)", security: [{ AdminBearer: [] }] },
      patch: { summary: "Update a vehicle category (ADMIN)", security: [{ AdminBearer: [] }] },
      delete: { summary: "Delete a vehicle category (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/price-plans": {
      get: { summary: "List price plans (ADMIN)", security: [{ AdminBearer: [] }] },
      post: { summary: "Create a price plan (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/price-plans/{id}": {
      get: { summary: "Get a price plan (ADMIN)", security: [{ AdminBearer: [] }] },
      patch: { summary: "Update a price plan (ADMIN)", security: [{ AdminBearer: [] }] },
      delete: { summary: "Delete a price plan (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/seasons": {
      get: { summary: "List rental seasons (ADMIN)", security: [{ AdminBearer: [] }] },
      post: { summary: "Create a rental season (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/seasons/{id}": {
      get: { summary: "Get a rental season (ADMIN)", security: [{ AdminBearer: [] }] },
      patch: { summary: "Update a rental season (ADMIN)", security: [{ AdminBearer: [] }] },
      delete: { summary: "Delete a rental season (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/extras": {
      get: { summary: "List extras (ADMIN)", security: [{ AdminBearer: [] }] },
      post: { summary: "Create an extra (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/extras/{id}": {
      get: { summary: "Get an extra (ADMIN)", security: [{ AdminBearer: [] }] },
      patch: { summary: "Update an extra (ADMIN)", security: [{ AdminBearer: [] }] },
      delete: { summary: "Delete an extra (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/locations": {
      get: { summary: "List rental locations (ADMIN)", security: [{ AdminBearer: [] }] },
      post: { summary: "Create a rental location (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/locations/{id}": {
      get: { summary: "Get a rental location (ADMIN)", security: [{ AdminBearer: [] }] },
      patch: { summary: "Update a rental location (ADMIN)", security: [{ AdminBearer: [] }] },
      delete: { summary: "Delete a rental location (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/offers": {
      get: { summary: "List offers (ADMIN)", security: [{ AdminBearer: [] }] },
      post: { summary: "Create an offer (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/offers/{id}": {
      get: { summary: "Get an offer (ADMIN)", security: [{ AdminBearer: [] }] },
      patch: { summary: "Update an offer (ADMIN)", security: [{ AdminBearer: [] }] },
      delete: { summary: "Delete an offer (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/faq": {
      get: { summary: "List FAQ entries (ADMIN)", security: [{ AdminBearer: [] }] },
      post: { summary: "Create an FAQ entry (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/faq/{id}": {
      get: { summary: "Get an FAQ entry (ADMIN)", security: [{ AdminBearer: [] }] },
      patch: { summary: "Update an FAQ entry (ADMIN)", security: [{ AdminBearer: [] }] },
      delete: { summary: "Delete an FAQ entry (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/pages": {
      get: { summary: "List CMS pages (ADMIN)", security: [{ AdminBearer: [] }] },
      post: { summary: "Create a CMS page (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/pages/{id}": {
      get: { summary: "Get a CMS page (ADMIN)", security: [{ AdminBearer: [] }] },
      patch: { summary: "Update a CMS page (ADMIN)", security: [{ AdminBearer: [] }] },
      delete: { summary: "Delete a CMS page (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/reviews": {
      get: { summary: "List reviews (ADMIN)", security: [{ AdminBearer: [] }] },
      post: { summary: "Create a review (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/reviews/{id}": {
      get: { summary: "Get a review (ADMIN)", security: [{ AdminBearer: [] }] },
      patch: { summary: "Update a review (ADMIN)", security: [{ AdminBearer: [] }] },
      delete: { summary: "Delete a review (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/home-content/sliders": {
      get: { summary: "List homepage sliders (ADMIN)", security: [{ AdminBearer: [] }] },
      post: { summary: "Create a homepage slider (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/home-content/sliders/{id}": {
      get: { summary: "Get a homepage slider (ADMIN)", security: [{ AdminBearer: [] }] },
      patch: { summary: "Update a homepage slider (ADMIN)", security: [{ AdminBearer: [] }] },
      delete: { summary: "Delete a homepage slider (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/home-content/banners": {
      get: { summary: "List homepage banners (ADMIN)", security: [{ AdminBearer: [] }] },
      post: { summary: "Create a homepage banner (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/home-content/banners/{id}": {
      get: { summary: "Get a homepage banner (ADMIN)", security: [{ AdminBearer: [] }] },
      patch: { summary: "Update a homepage banner (ADMIN)", security: [{ AdminBearer: [] }] },
      delete: { summary: "Delete a homepage banner (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/availability/blocks": {
      get: { summary: "List category unavailability blocks (ADMIN)", security: [{ AdminBearer: [] }] },
      post: { summary: "Block a category for a date range (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/availability/blocks/{id}": {
      patch: { summary: "Update a category unavailability block (ADMIN)", security: [{ AdminBearer: [] }] },
      delete: { summary: "Remove a category unavailability block (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/settings": {
      get: { summary: "List application settings (ADMIN)", security: [{ AdminBearer: [] }] },
      post: { summary: "Create an application setting (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/settings/{id}": {
      get: { summary: "Get an application setting (ADMIN)", security: [{ AdminBearer: [] }] },
      patch: { summary: "Update an application setting (ADMIN)", security: [{ AdminBearer: [] }] },
      delete: { summary: "Delete an application setting (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/quotes": {
      get: { summary: "List and filter quote requests (ADMIN or STAFF)", security: [{ AdminBearer: [] }] },
    },
    "/admin/quotes/export": {
      get: { summary: "Export matching quote requests as CSV (ADMIN or STAFF)", security: [{ AdminBearer: [] }] },
    },
    "/admin/quotes/{id}": {
      get: { summary: "Get a quote request (ADMIN or STAFF)", security: [{ AdminBearer: [] }] },
      patch: { summary: "Update quote status and pricing (ADMIN or STAFF)", security: [{ AdminBearer: [] }] },
    },
    "/admin/quotes/{id}/send-quote": {
      post: { summary: "Queue the customer quote email and transition to QUOTE_SENT (ADMIN or STAFF)", security: [{ AdminBearer: [] }] },
    },
    "/admin/payments": {
      get: { summary: "List payments (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/payments/{id}": {
      get: { summary: "Get payment details (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/payments/{id}/refund": {
      post: { summary: "Request a provider refund (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/contact-messages": {
      get: { summary: "List contact messages (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/contact-messages/{id}": {
      patch: { summary: "Mark a contact message read or unread (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/stats/overview": {
      get: { summary: "Quote, category and collected-deposit overview (ADMIN)", security: [{ AdminBearer: [] }] },
    },
    "/admin/uploads": {
      post: { summary: "Upload a validated image (ADMIN)", security: [{ AdminBearer: [] }] },
    },
  },
};

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.use("/uploads", express.static(resolve(process.cwd(), env.ADMIN_UPLOAD_DIR), {
  fallthrough: false,
  index: false,
  maxAge: "1d",
}));
app.use("/api/v1", publicRouter);
app.use("/api/v1", pricingRouter);
app.use("/api/v1", quotesRouter);
app.use("/api/v1", paymentsRouter);
app.use("/api/v1", availabilityRouter);
app.use("/api/v1", contactRouter);
app.use("/api", inquiriesRouter);
app.use("/api", reservationsRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api", checkoutRouter);
app.use("/api/v1", (_request, response) => {
  response.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: "Endpoint not found" },
  });
});
app.use("/api", (_request, response) => {
  response.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: "Endpoint not found" },
  });
});
app.use(errorHandler);

export { app };
