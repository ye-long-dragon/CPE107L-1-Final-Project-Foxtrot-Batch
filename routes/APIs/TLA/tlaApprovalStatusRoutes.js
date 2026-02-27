import express from 'express';
import Approval_Main from '../../models/tlaApproval_main.js';
import Approval_Backup1 from '../../models/tlaApproval_backup1.js';
import Approval_Backup2 from '../../models/tlaApproval_backup2.js';

const router = express.Router();

// CREATE Approval Status
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

// UPDATE Approval Status
router.put('/approval/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const updatedApproval = await Approval_Main.findByIdAndUpdate(id, req.body, { new: true });

        await Promise.all([
            Approval_Backup1.findByIdAndUpdate(id, req.body),
            Approval_Backup2.findByIdAndUpdate(id, req.body)
        ]);

        res.status(200).json(updatedApproval);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// READ Approval Status (Using Post)
router.post('/approval/search', async (req, res) => {
    try {
        const approvals = await Approval_Main.find(req.body).populate('tlaID');
        res.status(200).json(approvals);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE Approval Status
router.delete('/approval/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        await Approval_Main.findByIdAndDelete(id);
        
        res.status(200).json({ message: "Approval Status deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;