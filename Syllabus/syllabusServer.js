import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
// Corrected import to match the exact filename you confirmed
import coursesOverviewRouter from './routes/pages/courseOverview.js';
import landingPageRouter from './routes/pages/landingPage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.SYLLABUSPORT || 8300; 

// Middleware to parse form data from the Add Course popup
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set('views', path.join(__dirname, 'views')); 
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public'))); 

// Redirect root to /courses
app.get('/', (req, res) => {
    res.redirect('/courses');
});

// Routing for the Courses Overview page
app.use('/courses', coursesOverviewRouter); 

app.use('/home', landingPageRouter);

app.get('/syllabus', (req, res) => { res.render('syllabus'); });
app.get('/preview', (req, res) => { res.render('preview'); });

// Handle 404 errors
app.use((req, res) => {
    res.status(404).send('404 Not Found');
});

app.listen(PORT, () => {
  console.log(`Syllabus server is running on port ${PORT}`);
});