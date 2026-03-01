import express from 'express';
import { submitATA, approveATA, getPendingApprovals, viewATAForm } from '../controllers/ataController.js'; 
import { requireAuth } from '../middleware/authMiddleware.js'; 

const router = express.Router();

// 1. Submit or Save Draft ATA Form
router.post('/submit', requireAuth, submitATA);

// 2. Admin Approvals / Returns
router.put('/approve/:id', requireAuth, approveATA);

// 👇 NEW: The Inbox Route 👇
router.get('/pending', requireAuth, getPendingApprovals);

// 👇 NEW: Read-only view for the admin 👇
router.get('/view/:id', requireAuth, viewATAForm);


export default router;