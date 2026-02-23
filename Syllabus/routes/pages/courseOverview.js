import express from 'express';
import Syllabus from '../../models/syllabus.js'; 

const coursesOverviewRouter = express.Router();

/**
 * 0. BASE ROUTE
 * Handles: localhost:8300/courses
 */
coursesOverviewRouter.get('/', (req, res) => {
    // Redirects to a test user ID to avoid a 404 on the base URL
    res.redirect('/courses/507f1f77bcf86cd799439011');
});

/**
 * 1. READ & SEARCH
 * Fetches all syllabus entries for a specific user.
 * URL: /courses/:userId
 */
coursesOverviewRouter.get('/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const searchQuery = req.query.search ? req.query.search.toLowerCase() : '';

        // Querying the Syllabus collection using 'userID' to match your schema
        let userCourses = await Syllabus.find({ userID: userId });

        if (searchQuery) {
            userCourses = userCourses.filter(c => 
                (c.courseTitle && c.courseTitle.toLowerCase().includes(searchQuery)) || 
                (c.courseCode && c.courseCode.toLowerCase().includes(searchQuery))
            );
        }

        // Map database fields to the UI template properties
        const formattedCourses = userCourses.map(c => ({
            id: c._id.toString(), // The syllabusID used as a FOREIGN KEY in the ERD
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
        console.error("Database Fetch Error:", error);
        // Fallback to empty interface if the userId is invalid
        res.render('courseOverview', { courses: [], userId: req.params.userId, searchQuery: '' });
    }
});

/**
 * 2. CREATE
 * Adds a new master Syllabus record.
 * URL: /courses/:userId/add
 */
coursesOverviewRouter.post('/:userId/add', async (req, res) => {
    try {
        const userId = req.params.userId;
        const { courseCode, courseTitle } = req.body;

        const newSyllabus = new Syllabus({
            userID: userId,
            courseCode: courseCode,      
            courseTitle: courseTitle   
        });

        // Saves the master record to MongoDB
        await newSyllabus.save();

        res.redirect(`/courses/${userId}`);
    } catch (error) {
        console.error("Database Save Error:", error);
        res.status(500).send("Error adding new course.");
    }
});

/**
 * 3. DELETE
 * Removes a Syllabus record using its unique ID.
 * URL: /courses/:userId/delete/:courseId
 */
coursesOverviewRouter.post('/:userId/delete/:courseId', async (req, res) => {
    try {
        const { userId, courseId } = req.params;
        await Syllabus.findByIdAndDelete(courseId);
        res.redirect(`/courses/${userId}`);
    } catch (error) {
        console.error("Database Delete Error:", error);
        res.status(500).send("Error deleting course.");
    }
});

export { coursesOverviewRouter as default };