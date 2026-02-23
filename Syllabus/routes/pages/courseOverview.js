import express from 'express';
import Syllabus from '../../models/syllabus.js'; 

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

        const formattedCourses = userCourses.map(c => ({
            id: c._id.toString(), // The syllabusID foreign key for other tables
            code: c.courseCode,
            title: c.courseTitle,
            instructor: "TBA", 
            img: `https://picsum.photos/seed/${c._id}/400/200`
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

// 2. CREATE logic for the Add Course Popup
coursesOverviewRouter.post('/:userId/add', async (req, res) => {
    try {
        const userId = req.params.userId;
        const { courseCode, courseTitle } = req.body;
        const newSyllabus = new Syllabus({ userID: userId, courseCode, courseTitle });
        await newSyllabus.save();
        res.redirect(`/courses/${userId}`);
    } catch (error) {
        res.status(500).send("Error adding course to database.");
    }
});

export { coursesOverviewRouter as default };