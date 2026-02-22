import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import landingPageRouter from './routes/pages/landingPage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.SYLLABUSPORT || 3000;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// In development, disable caching so you always see file changes
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    next();
  });
}

app.use(express.static(path.join(__dirname, 'public')));
app.use('/', landingPageRouter);

// Main page as index: / and /index both serve the landing page
app.get('/index', (req, res) => res.redirect('/'));

app.get('/syllabus', (req, res) => {
  res.render('syllabus');
});

app.get('/preview', (req, res) => {
  res.render('preview');
});

app.use((req, res) => {
  res.status(404).send('404 Not Found');
});

app.listen(PORT, () => {
  console.log(`Syllabus server is running on port ${PORT}`);
});
