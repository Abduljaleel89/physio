import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { prisma } from "./prisma";
import authRoutes from "./routes/auth";
import exercisesRoutes from "./routes/exercises";
import therapyPlansRoutes from "./routes/therapyPlans";
import completionEventsRoutes from "./routes/completionEvents";
import patientsRoutes from "./routes/patients";
import analyticsRoutes from "./routes/analytics";
import visitRequestsRoutes from "./routes/visitRequests";
import appointmentsRoutes from "./routes/appointments";
import invoicesRoutes from "./routes/invoices";
import uploadsRoutes from "./routes/uploads";
import adminRoutes from "./routes/admin";
import notificationsRoutes from "./routes/notifications";
import doctorRoutes from "./routes/doctor";

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use(limiter);

// CORS configuration - update with your production domains
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
  // Add your Vercel production URL here (update this with your actual Vercel URL)
  'https://physio-3s3a.vercel.app',
  'https://physio1.vercel.app',
  // Allow any vercel.app subdomain for flexibility
  /^https:\/\/.*\.vercel\.app$/,
].filter(Boolean) as (string | RegExp)[];

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed || origin?.startsWith(allowed);
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ status: "Backend running", time: new Date().toISOString() });
});

// Serve static uploads (no directory listing)
const uploadsDir = path.join(process.cwd(), "backend", "uploads");
app.use(
  "/uploads",
  express.static(uploadsDir, {
    extensions: ["jpg", "jpeg", "png", "mp4", "webp", "mov", "avi"],
    index: false, // Disable directory listing
  })
);

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/exercises", exercisesRoutes);
app.use("/api/therapy-plans", therapyPlansRoutes);
app.use("/api/completion-events", completionEventsRoutes);
app.use("/api/patients", patientsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/visit-requests", visitRequestsRoutes);
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/invoices", invoicesRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/doctor", doctorRoutes);

async function waitForDb(retries = 20, delayMs = 1500): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return;
    } catch (e) {
      console.warn(`DB not ready, retrying ${i + 1}/${retries}...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('Database not reachable');
}

const PORT = process.env.PORT || 4000;
waitForDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
  })
  .catch((e) => {
    console.error('Failed to connect to DB on startup', e);
    process.exit(1);
  });
