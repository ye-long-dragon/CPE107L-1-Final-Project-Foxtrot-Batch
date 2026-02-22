// package.json must include: "type": "module"

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname replacement in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8400;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/views', express.static(path.join(__dirname, 'views')));

// Routes
app.get('/', (req, res) => {
    res.render(path.join(__dirname, 'views', 'dashboard.ejs'));
});

app.get('/dashboard', (req, res) => {
    res.render(path.join(__dirname, 'views', 'dashboard.ejs'));
});

app.get('/form', (req, res) => {
    res.render(path.join(__dirname, 'views', 'form.ejs'));
});

app.get('/overview', (req, res) => {
    res.render(path.join(__dirname, 'views', 'overview.ejs'));
});

// Start server
app.listen(PORT, () => {
    console.log("Current working directory:", process.cwd());
    console.log(`TLA Server running on http://localhost:${PORT}`);
});

// Export app (optional)
export default app;
