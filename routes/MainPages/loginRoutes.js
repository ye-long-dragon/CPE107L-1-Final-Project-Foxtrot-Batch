import express from "express";

const loginRoutes = express.Router();

// GET login page
loginRoutes.get("/", (req, res) => {
    res.render("MainPages/login");   // renders views/MainPages/login.ejs
});

export default loginRoutes;