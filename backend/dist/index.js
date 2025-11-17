"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const path_1 = __importDefault(require("path"));
const prisma_1 = require("./prisma");
const auth_1 = __importDefault(require("./routes/auth"));
const exercises_1 = __importDefault(require("./routes/exercises"));
const therapyPlans_1 = __importDefault(require("./routes/therapyPlans"));
const completionEvents_1 = __importDefault(require("./routes/completionEvents"));
const patients_1 = __importDefault(require("./routes/patients"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const visitRequests_1 = __importDefault(require("./routes/visitRequests"));
const appointments_1 = __importDefault(require("./routes/appointments"));
const invoices_1 = __importDefault(require("./routes/invoices"));
const uploads_1 = __importDefault(require("./routes/uploads"));
const admin_1 = __importDefault(require("./routes/admin"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const doctor_1 = __importDefault(require("./routes/doctor"));
const app = (0, express_1.default)();
app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
const limiter = (0, express_rate_limit_1.default)({ windowMs: 15 * 60 * 1000, max: 300 });
app.use(limiter);
// CORS configuration - update with your production domains
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001', // Alternative local port
    process.env.FRONTEND_URL,
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
    // Add your Vercel production URL here (update this with your actual Vercel URL)
    'https://physio-3s3a.vercel.app',
    'https://physio1.vercel.app',
    // Allow any vercel.app subdomain for flexibility
    /^https:\/\/.*\.vercel\.app$/,
    /^https:\/\/.*\.vercel\.com$/,
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) {
            return callback(null, true);
        }
        // In development, allow all origins
        if (process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }
        // Check if origin is allowed
        const isAllowed = allowedOrigins.some(allowed => {
            if (typeof allowed === 'string') {
                return origin === allowed || origin?.startsWith(allowed);
            }
            else if (allowed instanceof RegExp) {
                return allowed.test(origin);
            }
            return false;
        });
        if (isAllowed) {
            callback(null, true);
        }
        else {
            console.warn(`CORS blocked origin: ${origin}`);
            console.warn(`Allowed origins: ${JSON.stringify(allowedOrigins)}`);
            // In production, be strict but log for debugging
            callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json());
// Health check endpoint
app.get("/", (req, res) => {
    res.json({ status: "Backend running", time: new Date().toISOString() });
});
// Serve static uploads (no directory listing)
const uploadsDir = path_1.default.join(process.cwd(), "backend", "uploads");
app.use("/uploads", express_1.default.static(uploadsDir, {
    extensions: ["jpg", "jpeg", "png", "mp4", "webp", "mov", "avi"],
    index: false, // Disable directory listing
}));
// API routes
app.use("/api/auth", auth_1.default);
app.use("/api/exercises", exercises_1.default);
app.use("/api/therapy-plans", therapyPlans_1.default);
app.use("/api/completion-events", completionEvents_1.default);
app.use("/api/patients", patients_1.default);
app.use("/api/analytics", analytics_1.default);
app.use("/api/visit-requests", visitRequests_1.default);
app.use("/api/appointments", appointments_1.default);
app.use("/api/invoices", invoices_1.default);
app.use("/api/uploads", uploads_1.default);
app.use("/api/admin", admin_1.default);
app.use("/api/notifications", notifications_1.default);
app.use("/api/doctor", doctor_1.default);
async function waitForDb(retries = 30, delayMs = 2000) {
    if (!process.env.DATABASE_URL) {
        console.warn('⚠️  DATABASE_URL not set - database operations will fail');
        return false;
    }
    for (let i = 0; i < retries; i++) {
        try {
            await prisma_1.prisma.$queryRaw `SELECT 1`;
            console.log('✅ Database connection established');
            return true;
        }
        catch (e) {
            const errorMsg = e?.message || 'Unknown error';
            console.warn(`DB not ready, retrying ${i + 1}/${retries}... (${errorMsg})`);
            await new Promise((r) => setTimeout(r, delayMs));
        }
    }
    console.error('⚠️  Failed to connect to database after retries - server will start but DB operations may fail');
    return false;
}
const PORT = parseInt(process.env.PORT || '4000', 10);
// Start server regardless of DB connection status
// This allows the server to start and attempt DB connection in the background
waitForDb().then((connected) => {
    if (connected) {
        console.log('✅ Database ready - all features available');
    }
    else {
        console.warn('⚠️  Database not connected - some features may be unavailable');
    }
});
// Start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL environment variable is not set!');
    }
});
