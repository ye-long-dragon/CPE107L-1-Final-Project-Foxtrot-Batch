import express from "express";
const adminRoutes = express.Router();

// render admin dashboard
adminRoutes.get("/", async (req, res) => {
    res.render("MainPages/admin/adminDashboard", {
        currentPageCategory: "institution",
        announcements: [] 
    });
});

export default adminRoutes;