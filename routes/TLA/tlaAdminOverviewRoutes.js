import express from 'express';
import {
    requireLogin,
    requireApprovalRole,
    getAdminOverview
} from '../../controllers/tlaController.js';

const adminOverviewRoutes = express.Router();

// GET /tla/admin-overview  — submission queue for approver roles
adminOverviewRoutes.get('/', requireLogin, requireApprovalRole, getAdminOverview);

export default adminOverviewRoutes;
