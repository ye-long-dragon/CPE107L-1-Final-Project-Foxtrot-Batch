import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import ATAForm from './models/ATAForm.js'; 
import Course from './models/Course.js';
import ataRoutes from './routes/ataRoutes.js';

// ========================
// 1. SETUP
// ========================
// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config(); 
const app = express();
const PORT = process.env.ATAPORT || 8080;

// ========================
// 2. DATABASE CONNECTION (TEST DB)
// ========================
console.log("Attempting to connect to Test DB...");
mongoose.connect(process.env.ATA_TEST_URI)
    .then(() => console.log('✅ Connected to MongoDB (test database)'))
    .catch(err => console.error('❌ DB Connection Error:', err));

// ========================
// 3. MIDDLEWARE
// ========================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/ata', ataRoutes); 

// ========================
// 4. ROUTES
// ========================

// Page Routes
app.get('/', (req, res) => res.render('ATAmain'));
app.get('/ata', (req, res) => res.render('ATAmain'));
app.get('/dashboard/window', (req, res) => res.render('dashboard_window'));
app.get('/ata/new', (req, res) => res.render('new-ata'));
app.get('/submissions', (req, res) => res.render('submissions'));
app.get('/reports', (req, res) => res.render('reports'));
app.get('/profile', (req, res) => res.render('profile'));
app.get('/admin/courses', (req, res) => res.render('admin-courses'));

// ========================
// 5. API ROUTES (The Logic)
// ========================

// GET Dashboard Data (Mock)
app.get('/api/dashboard', (req, res) => {
    res.json({
        userName: 'John Doe',
        pendingSubmissions: 0,
        approvedSubmissions: 0
    });
});

// ==========================================
// COURSE MANAGEMENT ROUTES
// ==========================================

// A. VIEW: Show the Admin Course Manager Page
app.get('/admin/courses', (req, res) => {
    res.render('admin-courses');
});

// B. API: Save a New Course (Admin Input)
app.post('/api/admin/add-course', async (req, res) => {
    try {
        // Create new course from the form data
        const newCourse = new Course({
            courseCode: req.body.courseCode,
            units: req.body.units,
            courseTitle: req.body.description // Mapping 'description' from form to 'courseTitle'
        });
        
        await newCourse.save();
        console.log("✅ New Course Added:", req.body.courseCode);
        res.json({ success: true });
    } catch (error) {
        console.error("❌ Add Course Error:", error);
        // Handle duplicate error (E11000)
        if (error.code === 11000) {
            return res.json({ success: false, error: "Course code already exists!" });
        }
        res.json({ success: false, error: error.message });
    }
});

// C. API: Search Courses (For Faculty Autocomplete)
app.get('/api/courses/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.json([]);

        // Find courses starting with the query (e.g., "CP")
        const courses = await Course.find({
            courseCode: { $regex: '^' + query, $options: 'i' }
        }).limit(10); // Limit results to keep it fast

        res.json(courses);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Search failed' });
    }
});
// POST: Handle Form Submission
app.post('/api/ata/submit', async (req, res) => {
    try {
        console.log("📥 Receiving ATA Data:", req.body);

        // MAP the incoming data to your Schema
        // (Assuming your frontend sends 'sectionB' array for courses)
        const newATA = new ATAForm({
            userID: "TEST_USER_001", // Hardcoded for safety in Test Mode
            term: req.body.term || "2nd Term 2025-2026",
            status: "DRAFT",
            
            // Map Course Assignments (Section B)
            courseAssignments: req.body.sectionB ? req.body.sectionB.map(course => ({
                courseCode: course.courseCode,
                section: course.section,
                units: Number(course.units),
                effectiveUnits: Number(course.units) // Simple logic for now
            })) : [],

            // Map Admin Roles (Section A)
            administrativeRoles: req.body.sectionA ? req.body.sectionA.map(role => ({
                roleName: role.roleName,
                deloadingUnits: Number(role.units)
            })) : []
        });

        const savedForm = await newATA.save();
        console.log("✅ Form Saved ID:", savedForm._id);

        res.status(201).json({ success: true, message: 'ATA Form Saved Successfully!', id: savedForm._id });

    } catch (error) {
        console.error("❌ Save Error:", error);
        res.status(500).json({ success: false, message: 'Error saving form: ' + error.message });
    }
});
// ==========================================
// OPTION B ROUTE: Save as Embedded Array
// ==========================================
app.post('/admin/courses/save', async (req, res) => {
    try {
        console.log("📥 Receiving Bulk Course Data (Option B)...");

        const { program, title, courseCode, courseName, units } = req.body;

        // 1. Force inputs into Arrays (safety check for single entries)
        const codes = Array.isArray(courseCode) ? courseCode : [courseCode];
        const names = Array.isArray(courseName) ? courseName : [courseName];
        const unitList = Array.isArray(units) ? units : [units];

        // 2. Map the data into a strictly formatted list
        const courseList = codes.map((code, index) => {
            return {
                courseCode: code,
                courseTitle: names[index],
                units: Number(unitList[index])
            };
        });

        // 3. Create ONE document that contains everything
        const newTermCurriculum = new Course({
            program: program,
            term: title,
            courses: courseList // <--- The array goes here!
        });

        // 4. Save
        await newTermCurriculum.save();
        console.log(`✅ Saved curriculum for ${program} (${title}) with ${courseList.length} courses.`);

        res.redirect('/admin/courses');

    } catch (error) {
        console.error("❌ Save Error:", error);
        res.status(500).send("Error saving courses: " + error.message);
    }
});

// ========================
// 6. START SERVER
// ========================
app.listen(PORT, () => {
    console.log(`🚀 ATA Server running at http://localhost:${PORT}`);
    console.log(`📝 Test Form at http://localhost:${PORT}/ata/new`);
});