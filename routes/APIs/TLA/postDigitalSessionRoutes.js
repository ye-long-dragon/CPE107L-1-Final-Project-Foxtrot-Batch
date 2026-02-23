import express from 'express';
import PostDigital_Main from '../../models/postDigitalSession_main.js';
import PostDigital_Backup1 from '../../models/postDigitalSession_backup1.js';
import PostDigital_Backup2 from '../../models/postDigitalSession_backup2.js';

const router = express.Router();

// CREATE Post-Digital Session
router.post('/postDigital', async (req, res) => {
    try {
        const newSession = await PostDigital_Main.create(req.body);
        
        const backupData = { ...newSession.toObject() };
        delete backupData._id;

        await Promise.all([
            PostDigital_Backup1.create(backupData),
            PostDigital_Backup2.create(backupData)
        ]);

        res.status(201).json(newSession);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// UPDATE Post-Digital Session
router.put('/postDigital/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const updatedSession = await PostDigital_Main.findByIdAndUpdate(id, req.body, { new: true });

        await Promise.all([
            PostDigital_Backup1.findByIdAndUpdate(id, req.body),
            PostDigital_Backup2.findByIdAndUpdate(id, req.body)
        ]);

        res.status(200).json(updatedSession);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// READ Post-Digital Session (Using Post)
router.post('/postDigital/search', async (req, res) => {
    try {
        const sessions = await PostDigital_Main.find(req.body).populate('tlaID');
        res.status(200).json(sessions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE Post-Digital Session
router.delete('/postDigital/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        await PostDigital_Main.findByIdAndDelete(id);
        
        res.status(200).json({ message: "Post-Digital Session deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;