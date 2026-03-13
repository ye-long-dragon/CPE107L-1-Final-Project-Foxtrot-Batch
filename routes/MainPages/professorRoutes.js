import express from "express";
import { isAuthenticated, authorizeRoles } from "../../middleware/authMiddleware.js";

const professorRoutes = express.Router();

// GET login page
professorRoutes.get("/", isAuthenticated, authorizeRoles("Professor"), async(req, res) => {
        res.render("MainPages/institution", {
            currentPageCategory: "institution",
            user: req.session.user
        });
    }
);

professorRoutes.get("/syllabus", isAuthenticated, authorizeRoles("Professor"), async(req, res) => {
    res.redirect("/faculty");
});

export default professorRoutes;