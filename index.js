import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./database/mongo-dbconnect.js";
import session from 'express-session';
import cookieParser from 'cookie-parser'; // Added for ATA auth
import { requireAuth } from './middleware/authMiddleware.js'; // Added for ATA auth

// ========================
// ES Module __dirname fix
// ========================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========================
// Load .env from ROOT
// ========================
dotenv.config({ path: path.resolve(__dirname,".env") });
dotenv.config(); 
console.log("MONGO_URI:", process.env.MONGO_URI);   

const app = express();
const PORT = process.env.PORT || 3000;

// JSON
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Added for ATA auth

// Session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 1000 * 60 * 60 * 12,
        secure: false 
    }
}));

// ========================
// View Engine Setup
// ========================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ========================
// Static Assets
// ========================
app.use(express.static(path.join(__dirname, "public")));

// ========================
// Import Routes
// ========================
// Main Pages
import loginRoutes from "./routes/MainPages/loginRoutes.js";
import institutionRoutes from "./routes/MainPages/institutionRoutes.js";
import adminRoutes from "./routes/MainPages/adminRoutes.js";
import progChairRoutes from "./routes/MainPages/progChairRoutes.js";
import deanRoutes from "./routes/MainPages/deanRoutes.js";
import userRoutes from './routes/APIs/userRoutes.js';

// TLA
import dashBoardRoutes from "./routes/TLA/tlaDashboardRoutes.js";
import coursesRoutes from "./routes/TLA/tlaCoursesRoutes.js";
import overviewRoutes from "./routes/TLA/tlaOverviewRoutes.js";
import formRoutes from "./routes/TLA/tlaFormRoutes.js";
import approvalRoutes from "./routes/TLA/tlaApprovalRoutes.js";

// TLA APIs
import tlaApiRoutes          from "./routes/APIs/TLA/tlaRoutes.js";
import tlaApprovalApiRoutes  from "./routes/APIs/TLA/tlaApprovalStatusRoutes.js";
import tlaPreDigitalRoutes   from "./routes/APIs/TLA/tlaPreDigitalSessionRoutes.js";
import tlaPostDigitalRoutes  from "./routes/APIs/TLA/tlaPostDigitalSessionRoutes.js";

//Syllabus
import landingPageRouter from "./routes/Syllabus/landingPage.js";

// ATA
import ataPages from "./routes/ATA/ataPages.js";
import ataRoutes from './routes/ataRoutes.js'; // Added ATA API logic
import authRoutes from './routes/authRoutes.js'; // Added Auth logic

// ========================
// Routes
// ========================
// Main Pages
app.use("/login",loginRoutes);
app.use("/institution",institutionRoutes);
app.use("/admin/users", userRoutes); //admin user API
app.use("/admin",adminRoutes);
app.use("/progChair", progChairRoutes);
app.use("/dean", deanRoutes);

//TLA Pages
app.use("/tla/dashboard", dashBoardRoutes);
app.use("/tla/courses", coursesRoutes);
app.use("/tla/overview", overviewRoutes);
app.use("/tla/form", formRoutes);
app.use("/tla/approval", approvalRoutes);
app.get("/tla", (req, res) => res.redirect("/tla/courses"));

// TLA APIs
app.use("/api/tla/approval",      tlaApprovalApiRoutes);
app.use("/api/tla/pre-digital",   tlaPreDigitalRoutes);
app.use("/api/tla/post-digital",  tlaPostDigitalRoutes);
app.use("/api/tla",               tlaApiRoutes);

//Syllabus
app.use("/syllabus", landingPageRouter);

// ATA Pages & API
app.use("/auth", authRoutes); // Auth logic for ATA
app.use("/ata", ataPages);
app.use("/api/ata", ataRoutes); // API for ATA submissions

// --- ATA Secured Dashboard Routes ---
app.get('/dashboard/window', requireAuth, (req, res) => {
    res.render('dashboard_window', { 
        user: req.user, 
        role: req.user.role,
        employmentType: req.user.employmentType
    });
});

app.get('/ata/new', requireAuth, (req, res) => {
    res.render('new-ata', { 
        user: req.user, 
        role: req.user.role,
        employmentType: req.user.employmentType
    });
});

app.get('/submissions', requireAuth, (req, res) => res.render('submissions'));
app.get('/reports', requireAuth, (req, res) => res.render('reports'));
app.get('/profile', requireAuth, (req, res) => res.render('profile'));

// ========================
// 404 (LAST)
// ========================
app.use((req, res) => {
    res.status(404).send("404 not found");
});

// ========================
// database
// ========================
await connectDB();

// ========================
// Server
// ========================
app.listen(PORT, () => {
    console.log(`listening on port http://localhost:${PORT}`);
    console.log(`Login: http://localhost:${PORT}/login`);
    console.log(`Server Running`)
});