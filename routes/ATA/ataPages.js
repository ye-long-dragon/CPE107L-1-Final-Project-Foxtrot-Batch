import express from "express";
const router = express.Router();

// ========================
// ATA PAGE ROUTES
// ========================

// Main ATA landing page
router.get("/", (req, res) => res.render("ATA/AtaMain")); // NO leading slash, match exact filename

// ATA Form page
router.get("/new", (req, res) => res.render("ATA/new-ata"));

// Dashboard window
router.get("/dashboardwindow", (req, res) => res.render("ATA/dashboard_window"));

// Other pages
router.get("/submissions", (req, res) => res.render("ATA/submissions"));
router.get("/reports", (req, res) => res.render("ATA/reports"));
router.get("/profile", (req, res) => res.render("ATA/profile"));

// Admin course manager
router.get("/admin/courses", (req, res) => res.render("ATA/admin-courses"));

export default router;