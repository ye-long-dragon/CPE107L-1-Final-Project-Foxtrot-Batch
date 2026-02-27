import express from 'express';
import Approval_Main from '../../models/tlaApproval_main.js';
import Approval_Backup1 from '../../models/tlaApproval_backup1.js';
import Approval_Backup2 from '../../models/tlaApproval_backup2.js';

const router = express.Router();

// CREATE
router.post('/approval', async (req, res) => {
    try {
        const newApproval = await Approval_Main.create(req.body);
        
        const backupData = { ...newApproval.toObject() };
        delete backupData._id;

        await Promise.all([
            Approval_Backup1.create(backupData),
            Approval_Backup2.create(backupData)
        ]);

        res.status(201).json(newApproval);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// UPDATE
router