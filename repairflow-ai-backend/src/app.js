
import express from "express";
import cors from "cors";
import helmet from "helmet";

// Routes
import authRoutes from "./routes/auth.routes.js";
import customerRoutes from "./routes/customers.routes.js";
import repairRoutes from "./routes/repairs.routes.js";
import productRoutes from "./routes/products.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

import aiRoutes from "./routes/ai.routes.js";
import diagnosisRoutes from "./routes/diagnoses.routes.js";
import integrationsRoutes from "./routes/integrations.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import workflowRoutes from "./routes/workflow.routes.js";

// Error middleware
import {
  notFound,
  errorHandler
} from "./middleware/errors.js";

import telegramWebhookRoutes
  from "./routes/telegramWebhook.routes.js";


const app = express();

// -----------------------------
// Security
// -----------------------------

app.use(helmet());


// -----------------------------
// CORS
// -----------------------------

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN
      ? process.env.CLIENT_ORIGIN
          .split(",")
          .map(s => s.trim())
      : "http://localhost:5173"
  })
);


// -----------------------------
// Body Parser
// -----------------------------

app.use(
  express.json({
    limit: "1mb"
  })
);


// -----------------------------
// Health Check
// -----------------------------

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      success: true,
      message: "REPAIRFLOW AI API is running."
    });
  }
);


// -----------------------------
// API Routes
// -----------------------------

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/customers",
  customerRoutes
);

app.use(
  "/api/repairs",
  repairRoutes
);

app.use(
  "/api/products",
  productRoutes
);

app.use(
  "/api/dashboard",
  dashboardRoutes
);


// -----------------------------
// AI / Diagnosis
// -----------------------------

app.use(
  "/api/ai",
  aiRoutes
);

app.use(
  "/api/diagnoses",
  diagnosisRoutes
);


// -----------------------------
// External Integrations
// -----------------------------

app.use(
  "/api/integrations",
  integrationsRoutes
);


// -----------------------------
// Notifications
// -----------------------------

app.use(
  "/api/notifications",
  notificationsRoutes
);


// -----------------------------
// Workflow
// -----------------------------

app.use(
  "/api/workflow",
  workflowRoutes
);

app.use(
  "/api/telegram/webhook",
  telegramWebhookRoutes
);
// 404 Handler
// -----------------------------

app.use(notFound);


// -----------------------------
// Global Error Handler
// -----------------------------

app.use(errorHandler);


export default app;