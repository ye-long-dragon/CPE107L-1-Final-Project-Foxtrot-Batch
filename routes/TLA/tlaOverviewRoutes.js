import express from "express";
import { requireLogin, getOverview } from "../../controllers/tlaController.js";

const overviewRoutes = express.Router();

// GET /tla/overview
overviewRoutes.get("/", requireLogin, getOverview);

export default overviewRoutes;