import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose'; // Added missing import
import { fileURLToPath } from 'url';
import coursesOverviewRouter from './routes/pages/courseOverview.js';
import landingPageRouter from './routes/pages/landingPage.js';

// 1. Initialize dotenv first so environment variables are available
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.SYLLABUSPORT || 8300; 

// 2. Connect to MongoDB using the loaded environment variables
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/syllabusDB';
mongoose.connect(mongoURI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// 3. Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 4. View Engine and Static Files
app.set('views', path.join(__dirname, 'views')); 
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public'))); 

// 5. Routes
app.get('/', (req, res) => {
    res.redirect('/courses');
});

// Mounted to /courses to match your router's base redirects
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