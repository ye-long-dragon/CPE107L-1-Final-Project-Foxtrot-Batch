// In your route file (e.g., routes/admin.js)
import express from 'express';
import Course from '../models/Course.js'; // Import your schema
const router = express.Router();

router.post('/admin/courses/save', async (req, res) => {
    try {
        const { program, title, courseCode, courseName, units } = req.body;

        // 1. Check if we have multiple courses (Array) or just one (String)
        // If the user only added 1 row, these will be strings, so we force them into arrays.
        const codes = Array.isArray(courseCode) ? courseCode : [courseCode];
        const names = Array.isArray(courseName) ? courseName : [courseName];
        const unitList = Array.isArray(units) ? units : [units];

        // 2. Prepare the array of objects to save
        const coursesToSave = codes.map((code, index) => {
            return {
                program: program,          // Same program for all
                term: title,               // Same term for all (mapped to 'title' from form)
                courseCode: code,
                courseTitle: names[index], // Match index 0 with 0, 1 with 1...
                units: unitList[index],
                collegeId: "CEA"           // Default or dynamic
            };
        });

        // 3. Bulk Save to Database 
        // insertMany is much faster than saving one by one
        await Course.insertMany(coursesToSave);

        console.log('Courses saved successfully!');
        res.redirect('/admin/courses'); // Go back to the page

    } catch (error) {
        console.error(error);
        res.status(500).send("Error saving courses: " + error.message);
    }
});

export default router;