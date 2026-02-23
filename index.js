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
import adminConfigUserRoutes from "./routes/MainPages/adminConfigUsers.js";

// TLA
import dashBoardRoutes from "./routes/TLA/dashboardRoutes.js";
import overviewRoutes from "./routes/TLA/overviewRoutes.js";
import formRoutes from "./routes/TLA/formRoutes.js";

//Syllabus
import landingPageRouter from "./routes/Syllabus/landingPage.js";

// ========================
// Routes
// ========================
app.use("/login",loginRoutes)
app.use("/institution",institutionRoutes)
app.use("/admin",adminRoutes)
app.use("/admin/users", adminConfigUserRoutes)

//TLA
app.use("/tla", dashBoardRoutes)
app.use("/tla/overview", overviewRoutes)
app.use("/tla/form", formRoutes)

//Syllabus
app.use("/syllabus", landingPageRouter)

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
