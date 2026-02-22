import path from "path";
import express from "express";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3002;

// __dirname fix for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/twa/public", express.static(path.join(__dirname, "public")));

// Routes
app.get("/twa", (req, res) => res.redirect("/twa/dashboard"));

app.get("/twa/dashboard", (req, res) => res.render("twsLandingPage"));
app.get("/twa/faculty-info", (req, res) => res.render("twsFacultyInfo"));
app.get("/twa/teaching-load", (req, res) => res.render("twsTeachingLoad"));
app.get("/twa/submission-status", (req, res) => res.render("twsSubmissionStatus"));
app.get("/twa/summary", (req, res) => res.render("twsSummary"));
app.get("/twa/archived", (req, res) => res.render("twsArchived"));
app.get("/twa/approval-routing", (req, res) => res.render("twsApprovalRouting"));

app.listen(PORT, () => {
  console.log(`✅ TWA running at http://localhost:${PORT}/twa/dashboard`);
});