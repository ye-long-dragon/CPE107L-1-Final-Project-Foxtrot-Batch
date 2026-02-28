import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./database/mongo-dbconnect.js";


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
import loginRoutes from "./routes/MainPages/loginRoutes.js";
import institutionRoutes from "./routes/MainPages/institutionRoutes.js";
import adminRoutes from "./routes/MainPages/adminRoutes.js";

// TLA
import dashBoardRoutes from "./routes/TLA/dashboardRoutes.js";
import overviewRoutes from "./routes/TLA/overviewRoutes.js";
import formRoutes from "./routes/TLA/formRoutes.js";

//Syllabus
import newSyllabusRoutes from "./routes/Syllabus/newSyllabusRoutes.js";
import infoSyllabusRoutes from "./routes/Syllabus/infoSyllabusRoutes.js";
import scheduleSyllabusRoutes from "./routes/Syllabus/scheduleSyllabusRoutes.js";

// ========================
// Routes
// ========================
app.use("/login",loginRoutes)
app.use("/institution",institutionRoutes)
app.use("/admin",adminRoutes)

//TLA
app.use("/tla", dashBoardRoutes)
app.use("/tla/overview", overviewRoutes)
app.use("/tla/form", formRoutes)

// Syllabus — specific routes MUST come before the wildcard /:userId handler
app.get("/syllabus", (req, res) => {
    res.redirect("/syllabus/507f1f77bcf86cd799439011");
});
app.use("/syllabus/api", syllabusCourseOverviewActions);
app.use("/syllabus/approval", syllabusApprovalStatusActions);
app.use("/syllabus/create", newSyllabusRoutes);
app.use("/syllabus/info", infoSyllabusRoutes);
app.use("/syllabus/schedule", scheduleSyllabusRoutes);
app.use("/syllabus", courseOverviewRoutes); // wildcard /:userId — MUST be last

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
