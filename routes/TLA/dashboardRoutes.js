import express from "express";

const dashboardRoutes = express.Router();

// GET dashboard page
dashboardRoutes.get("/", (req, res) =>{
    res.render("TLA/dashboard", {currentPageCategory: "tla"}); // renders the views/TLA/dashboard.ejs
});

export default dashboardRoutes;