import express from "express";

const formRoutes = express.Router();

// GET dashboard page
formRoutes.get("/", (req, res) =>{
    res.render("TLA/form", {currentPageCategory: "tla"}); // renders the views/TLA/form.ejs
});

export default formRoutes;