import express from 'express';
import {
    requireLogin,
    requireHRRole,
    getHRDashboard,
    postHRArchive
} from '../../controllers/tlaController.js';

const hrRoutes = express.Router();

// GET  /tla/hr              — HR archiving dashboard
hrRoutes.get('/', requireLogin, requireHRRole, getHRDashboard);

// POST /tla/hr/archive/:id  — archive a specific Dean-Approved TLA
hrRoutes.post('/archive/:id', requireLogin, requireHRRole, postHRArchive);

export default hrRoutes;
