import express from "express";
import { mainDB } from "../../database/mongo-dbconnect.js"; 
import userSchema from "../../models/user.js";

const progChairRoutes = express.Router();

const MainUser = mainDB.model("User", userSchema);

progChairRoutes.get("/institution", async (req, res) => {
    res.render("MainPages/dean/deanDashboard", {
        currentPageCategory: "institution",
        announcements: [] 
    });
});


export default progChairRoutes;