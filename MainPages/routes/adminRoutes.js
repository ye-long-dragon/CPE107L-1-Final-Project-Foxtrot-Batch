import express from "express";
const adminRoutes = express.Router();

// render admin dashboard
adminRoutes.get("/", async (req, res) => {
    res.render("admin/adminDashboard", { announcements: [] });
});

export default adminRoutes;