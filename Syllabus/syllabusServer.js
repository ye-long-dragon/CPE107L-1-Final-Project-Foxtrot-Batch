import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import coursesOverviewRouter from './routes/pages/coursesOverviewRouter.js';
import landingPageRouter from './routes/pages/landingPage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.SYLLABUSPORT || 8300; // Updated to match your terminal port

// Set views directory and engine
app.set('views', path.join(__dirname, 'views')); 
app.set('view engine', 'ejs');

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public'))); 

// Redirect root to /courses to show the Overview page immediately
app.get('/', (req, res) => {
    res.redirect('/courses');
});

// Routing for the new Courses Overview page
app.use('/courses', coursesOverviewRouter); 

// Landing page moved to /home
app.use('/home', landingPageRouter);

// Original syllabus form route
app.get('/syllabus', (req, res) => {
  res.render('syllabus');
});

app.get('/preview', (req, res) => {
  res.render('preview');
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).send('404 Not Found');
});

app.listen(PORT, () => {
  console.log(`Syllabus server is running on port ${PORT}`);
});