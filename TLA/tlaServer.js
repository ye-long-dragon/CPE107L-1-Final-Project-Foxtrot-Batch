const express = require('express');
const path = require('path');

const app = express();
const PORT = 3003;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/views', express.static(path.join(__dirname, 'views')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/form', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'form.html'));
});

app.get('/overview', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'overview.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`TLA Server running on http://localhost:${PORT}`);
});

module.exports = app;
