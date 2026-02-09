import express from "express";

const router = express.Router();

// GET login page
router.get("/", (req, res) => {
    res.render("login");   // renders views/login.ejs
});

export default router;