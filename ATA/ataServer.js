require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.ATAPORT || 8080;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ROUTES
app.get('/', (req, res) => res.render('ATAmain'));
app.get('/ata', (req, res) => res.render('ATAmain')); // ATA goes to main page
app.get('/dashboard/window', (req, res) => res.render('dashboard_window'));
app.get('/ata/new', (req, res) => res.render('new-ata')); // New ATA form page
app.get('/submissions', (req, res) => res.render('submissions'));
app.get('/reports', (req, res) => res.render('reports'));
app.get('/profile', (req, res) => res.render('profile'));

// MOCK API
app.get('/api/dashboard', (req, res) => {
    res.json({
        userName: 'John Doe',
        pendingSubmissions: 0,
        approvedSubmissions: 0
    });
});

// START SERVER
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});