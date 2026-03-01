import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser'; 
import { requireAuth } from './middleware/authMiddleware.js';

// Import Routers
import ataRoutes from './routes/ataRoutes.js';
import authRoutes, { mockUsers } from './routes/authRoutes.js'; // for login simulation
import adminRoutes from './routes/admin.js';     

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config(); 
const app = express();
const PORT = process.env.ATAPORT || 8200;

// ========================
// DATABASE CONNECTION
// ========================
console.log("Attempting to connect to Test DB...");
mongoose.connect(process.env.ATA_TEST_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ DB Connection Error:', err));

// ========================
// MIDDLEWARE
// ========================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); 

// ========================
// ROUTES (The Traffic Cop)
// ========================

// 1. Page Routes (Public)
app.get('/', (req, res) => res.render('AtaMain', { mockUsers }));
app.get('/ata', (req, res) => res.render('AtaMain', { mockUsers }));

// 2. Secured Page Routes (Requires Login)
// 👇 The Dashboard now checks the cookie and passes the Dean role to EJS!
// 2. Secured Page Routes (Requires Login)
app.get('/dashboard/window', requireAuth, (req, res) => {
    res.render('dashboard_window', { 
        user: req.user, 
        role: req.user.role,
        employmentType: req.user.employmentType // 👈 NEW
    });
});

app.get('/ata/new', requireAuth, (req, res) => {
    res.render('new-ata', { 
        user: req.user, 
        role: req.user.role,
        employmentType: req.user.employmentType // 👈 NEW
    });
});

app.get('/submissions', requireAuth, (req, res) => res.render('submissions'));
app.get('/reports', requireAuth, (req, res) => res.render('reports'));
app.get('/profile', requireAuth, (req, res) => res.render('profile'));

// 2. API Routes
app.use('/auth', authRoutes);   // Handles the Login Simulator
app.use('/ata', ataRoutes);     // Handles Form Submission/Viewing
app.use('/admin', adminRoutes); // Handles Course management

// ========================
// START SERVER
// ========================
app.listen(PORT, () => {
    console.log(`🚀 ATA Server running at http://localhost:${PORT}`);
});