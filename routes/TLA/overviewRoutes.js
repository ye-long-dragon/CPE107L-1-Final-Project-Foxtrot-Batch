import express from "express";

const overviewRoutes = express.Router();

// GET dashboard page
overviewRoutes.get("/", (req, res) =>{
    res.render("TLA/overview"); // renders the views/TLA/overview.ejs
});

export default overviewRoutes;