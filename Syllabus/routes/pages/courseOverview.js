import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import Syllabus from '../../models/syllabus.js';

// Multer config — store in memory so we can convert to base64 for MongoDB
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const mimeOk = allowed.test(file.mimetype);
        if (mimeOk) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (jpg, png, gif, webp) are allowed'));
        }
    }
});

const coursesOverviewRouter = express.Router();

/**
 * 0. BASE ROUTE
 * Handles: localhost:8300/courses
 * Redirects to a test user ID to prevent teammate 404s
 */
coursesOverviewRouter.get('/', (req, res) => {
    res.redirect('/courses/507f1f77bcf86cd799439011');
});

/**
 * API: Fetch Users for Instructor Dropdown
 * Must be defined BEFORE /:userId to prevent route conflict
 */
coursesOverviewRouter.get('/api/users', async (req, res) => {
    try {
        // Dynamically check if the User model exists (will be available after main branch merge)
        const User = mongoose.models.User;
        if (!User) {
            return res.json([]);
        }
        const users = await User.find({}, 'firstName lastName email role');
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.json([]);
    }
});

/*
 * Searches courseTitle and courseCode, case-insensitive
 * Must be defined BEFORE /:userId to prevent route conflict
 */
coursesOverviewRouter.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q || '';
        const userId = req.query.userId || '';

        // Build the filter — match userID and search in title or code
        const filter = { userID: userId };
        if (query) {
            const regex = new RegExp(query, 'i'); // case-insensitive
            filter.$or = [
                { courseTitle: { $regex: regex } },
                { courseCode: { $regex: regex } }
            ];
        }

        let courses = await Syllabus.find(filter);

        // Populate instructor if User model exists
        if (mongoose.models.User) {
            await Syllabus.populate(courses, { path: 'assignedInstructor' });
        }

        const formatted = courses.map(c => ({
            id: c._id.toString(),
            code: c.courseCode,
            title: c.courseTitle,
            instructor: c.assignedInstructor
                ? `${c.assignedInstructor.firstName} ${c.assignedInstructor.lastName}`
                : "TBA",
            img: (c.courseImage && c.courseImage.startsWith('data:'))
                ? c.courseImage
                : `https://picsum.photos/seed/${c._id}/400/200`
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error searching courses:', error);
        res.json([]);
    }
});

/**
 * 1. READ & SEARCH
 * Fetches syllabus entries tied to the Professor (User)
 */
coursesOverviewRouter.get('/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const searchQuery = req.query.search ? req.query.search.toLowerCase() : '';

        // Querying with 'userID' matching your model
        let userCourses = await Syllabus.find({ userID: userId });

        if (searchQuery) {
            userCourses = userCourses.filter(c => 
                (c.courseTitle && c.courseTitle.toLowerCase().includes(searchQuery)) || 
                (c.courseCode && c.courseCode.toLowerCase().includes(searchQuery))
            );
        }

        // Populate instructor names only if the User model exists (comes from main branch)
        if (mongoose.models.User) {
            await Syllabus.populate(userCourses, { path: 'assignedInstructor' });
        }

        const formattedCourses = userCourses.map(c => ({
            id: c._id.toString(),
            code: c.courseCode,
            title: c.courseTitle,
            instructor: c.assignedInstructor 
                ? `${c.assignedInstructor.firstName} ${c.assignedInstructor.lastName}` 
                : "TBA", 
            img: (c.courseImage && c.courseImage.startsWith('data:')) 
                ? c.courseImage 
                : `https://picsum.photos/seed/${c._id}/400/200`
        }));

        res.render('courseOverview', { 
            courses: formattedCourses, 
            userId: userId, 
            searchQuery: req.query.search || '' 
        });
    } catch (error) {
        // Safe fallback: Renders the UI with 0 courses if the DB isn't ready
        console.error("Database connection failed for teammate:", error);
        res.render('courseOverview', { courses: [], userId: req.params.userId, searchQuery: '' });
    }
});

// 2. CREATE logic for the Add Course Popup (with image upload)
coursesOverviewRouter.post('/:userId/add', upload.single('courseImage'), async (req, res) => {
    try {
        const userId = req.params.userId;
        const { courseCode, courseTitle, assignedInstructor } = req.body;

        // Check for duplicate course code (case-insensitive)
        const existingCode = await Syllabus.findOne({
            userID: userId,
            courseCode: { $regex: new RegExp(`^${courseCode}$`, 'i') }
        });
        if (existingCode) {
            return res.status(409).json({ 
                error: 'duplicate', 
                field: 'courseCode', 
                message: `A course with code "${courseCode}" already exists.` 
            });
        }

        // Check for duplicate course title (case-insensitive)
        const existingTitle = await Syllabus.findOne({
            userID: userId,
            courseTitle: { $regex: new RegExp(`^${courseTitle}$`, 'i') }
        });
        if (existingTitle) {
            return res.status(409).json({ 
                error: 'duplicate', 
                field: 'courseTitle', 
                message: `A course named "${courseTitle}" already exists.` 
            });
        }

        const syllabusData = { userID: userId, courseCode, courseTitle };
        
        // Only set instructor if a valid selection was made
        if (assignedInstructor && assignedInstructor !== '') {
            syllabusData.assignedInstructor = assignedInstructor;
        }

        // Convert uploaded image to base64 data URI and store in MongoDB
        if (req.file) {
            const base64 = req.file.buffer.toString('base64');
            syllabusData.courseImage = `data:${req.file.mimetype};base64,${base64}`;
        }
        
        const newSyllabus = new Syllabus(syllabusData);
        await newSyllabus.save();
        res.json({ success: true, redirect: `/courses/${userId}` });
    } catch (error) {
        console.error('Error adding course:', error);
        res.status(500).json({ error: 'server', message: 'Error adding course to database.' });
    }
});

// 3. BULK DELETE — Remove multiple courses from the database
coursesOverviewRouter.post('/:userId/delete-bulk', express.json(), async (req, res) => {
    try {
        const { userId } = req.params;
        const { courseIds } = req.body;

        if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
            return res.status(400).json({ error: 'No courses selected for deletion.' });
        }

        await Syllabus.deleteMany({ _id: { $in: courseIds }, userID: userId });
        res.json({ success: true, redirect: `/courses/${userId}` });
    } catch (error) {
        console.error('Error deleting courses:', error);
        res.status(500).json({ error: 'Error deleting courses from database.' });
    }
});

export { coursesOverviewRouter as default };