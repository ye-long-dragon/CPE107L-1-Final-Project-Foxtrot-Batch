import express from "express";
import { mainDB } from "../../database/mongo-dbconnect.js"; 
import userSchema from "../../models/user.js";
import { isAuthenticated, authorizeRoles } from "../../middleware/authMiddleware.js";

const progChairRoutes = express.Router();

const MainUser = mainDB.model("User", userSchema);

progChairRoutes.get("/institution", isAuthenticated, authorizeRoles("Program-Chair"), async (req, res) => {
    res.render("MainPages/progChair/progChairDashboard", {
        currentPageCategory: "institution",
        announcements: [],
        user: req.session.user
    });
});

progChairRoutes.get("/syllabus", isAuthenticated, authorizeRoles("Program-Chair"), async (req, res) => {
    res.redirect("/syllabus/prog-chair");
});


export default progChairRoutes;