import express from "express";
import User from "../../models/user.js";

const adminConfigUserRoutes = express.Router();

// GET: Display the page and list users
adminConfigUserRoutes.get("/", async (req, res) => {
    try {
        const templateData = {
            currentPageCategory: "users",
            users: [] 
        };
        return res.render("MainPages/admin/adminConfigUsers", templateData);
    } catch (err) {
        console.error(err);
        return res.status(500).send("Error fetching users");
    }
});

// POST: Add a new user
adminConfigUserRoutes.post("/add", async (req, res) => {
    try {
        const { fullName, email, role, uid } = req.body;
        // await User.create({ fullName, email, role, uid });
        console.log("Adding User:", req.body);
        res.redirect("/admin/users");
    } catch (err) {
        res.status(500).send("Error adding user");
    }
});

// DELETE: Remove a user
adminConfigUserRoutes.post("/delete/:id", async (req, res) => {
    try {
        // await User.findByIdAndDelete(req.params.id);
        console.log("Deleting User ID:", req.params.id);
        res.redirect("/admin/users");
    } catch (err) {
        res.status(500).send("Error deleting user");
    }
});

export default adminConfigUserRoutes;