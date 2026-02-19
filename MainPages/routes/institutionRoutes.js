import express from "express";

const institutionRoutes = express.Router();

// GET login page
institutionRoutes.get("/", (req, res) => {
    res.render("institution");   // renders views/institution.ejs
});

export default institutionRoutes;