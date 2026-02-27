import express from "express";

const institutionRoutes = express.Router();

// GET login page
institutionRoutes.get("/", (req, res) => {
    res.render("MainPages/institution", {currentPageCategory: "institution"});   // renders views/MainPages/institution.ejs
});

export default institutionRoutes;