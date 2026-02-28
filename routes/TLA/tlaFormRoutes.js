import express from "express";
import {
    requireLogin,
    getNewForm,
    getFormById,
    createTLA,
    updateTLA
} from "../../controllers/tlaController.js";

const formRoutes = express.Router();

// GET /tla/form        – blank new form
formRoutes.get("/", requireLogin, getNewForm);

// GET /tla/form/:id   – existing TLA pre-filled
formRoutes.get("/:id", requireLogin, getFormById);

// POST /tla/form      – create new TLA
formRoutes.post("/", requireLogin, createTLA);

// POST /tla/form/:id  – update existing TLA
formRoutes.post("/:id", requireLogin, updateTLA);

export default formRoutes;