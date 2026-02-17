import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ========================
// ES Module __dirname fix
// ========================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========================
// Load .env from ROOT
// ========================
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.MAINPAGESPORT || 3000;

// ========================
// View Engine Setup
// ========================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ========================
// Static Assets
// ========================
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.static(path.join(__dirname, "public")));

// Global public (root/public)
app.use(express.static(path.join(__dirname, "../public")));

// MainPages public (MainPages/public)
app.use(express.static(path.join(__dirname, "public")));

//Import Routes
import loginRoutes from "./routes/loginRoutes.js"
import institutionRoutes from "./routes/institutionRoutes.js"

// ========================
// Routes
// ========================
app.use("/login",loginRoutes)
app.use("/institution",institutionRoutes)
// ========================
// 404 (LAST)
// ========================
app.use((req, res) => {
    res.status(404).send("404 not found");
});

// ========================
// Server
// ========================
app.listen(PORT, () => {
    console.log(`MainPages listening on port http://localhost:${PORT}`);
});
