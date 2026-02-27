import express from 'express';
import PreDigital_Main from '../../models/preDigitalSession_main.js';
import PreDigital_Backup1 from '../../models/preDigitalSession_backup1.js';
import PreDigital_Backup2 from '../../models/preDigitalSession_backup2.js';

const router = express.Router();

// CREATE Pre-Digital Session
router.post('/preDigital', async (req, res) => {
    try {
        const newSession = await PreDigital_Main.create(req.body);
        
        const backupData = { ...newSession.toObject() };
        delete backupData._id;

        await Promise.all([
            PreDigital_Backup1.create(backupData),
            PreDigital_Backup2.create(backupData)
        ]);

        res.status(201).json(newSession);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// UPDATE Pre-Digital Session
router.put('/preDigital/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const updatedSession = await PreDigital_Main.findByIdAndUpdate(id, req.body, { new: true });

        await Promise.all([
            PreDigital_Backup1.findByIdAndUpdate(id, req.body),
            PreDigital_Backup2.findByIdAndUpdate(id, req.body)
        ]);

        res.status(200).json(updatedSession);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// READ Pre-Digital Session (Using Post)
router.post('/preDigital/search', async (req, res) => {
    try {
        const sessions = await PreDigital_Main.find(req.body).populate('tlaID');
        res.status(200).json(sessions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE Pre-Digital Session
router.delete('/preDigital/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        await PreDigital_Main.findByIdAndDelete(id);
        
        res.status(200).json({ message: "Pre-Digital Session deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;