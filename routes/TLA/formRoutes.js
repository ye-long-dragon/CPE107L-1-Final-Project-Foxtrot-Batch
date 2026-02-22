import express from "express";

const formRoutes = express.Router();

// GET dashboard page
formRoutes.get("/", (req, res) =>{
    res.render("TLA/overview"); // renders the views/TLA/form.ejs
});

export default formRoutes;