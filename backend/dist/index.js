"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
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
const app = (0, express_1.default)();
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
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        // In development, allow all origins for easier testing
        if (process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }
        // In production, check against allowed origins
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
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
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
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
