import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import Syllabus from '../../models/syllabus.js';
import SyllabusApprovalStatus from '../../models/syllabusApprovalStatus.js';

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

coursesOverviewRouter.get('/', (req, res) => {
    res.redirect('/courses/507f1f77bcf86cd799439011');
});

coursesOverviewRouter.get('/api/users', async (req, res) => {
    try {
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

coursesOverviewRouter.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q || '';
        const userId = req.query.userId || '';

        const filter = { userID: userId };
        if (query) {
            const regex = new RegExp(query, 'i');
            filter.$or = [
                { courseTitle: { $regex: regex } },
                { courseCode: { $regex: regex } }
            ];
        }

        let courses = await Syllabus.find(filter);

        if (mongoose.models.User) {
            await Syllabus.populate(courses, { path: 'assignedInstructor' });
        }

        const courseIds = courses.map(c => c._id.toString());
        const approvals = await SyllabusApprovalStatus.find({ syllabusID: { $in: courseIds } });

        const formatted = courses.map(c => {
            const idStr = c._id.toString();
            const draftRecord = approvals.find(a => a.syllabusID === idStr);

            return {
                id: idStr,
                code: c.courseCode,
                title: c.courseTitle,
                instructor: c.assignedInstructor
                    ? `${c.assignedInstructor.firstName} ${c.assignedInstructor.lastName}`
                    : "TBA",
                img: (c.courseImage && c.courseImage.startsWith('data:'))
                    ? c.courseImage
                    : `https://picsum.photos/seed/${c._id}/400/200`,
                hasDraft: !!draftRecord, 
                status: draftRecord ? draftRecord.status : "No Syllabus Draft"
            };
        });

        res.json(formatted);
    } catch (error) {
        console.error('Error searching courses:', error);
        res.json([]);
    }
});

coursesOverviewRouter.get('/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const searchQuery = req.query.search ? req.query.search.toLowerCase() : '';

        let userCourses = await Syllabus.find({ userID: userId });

        if (searchQuery) {
            userCourses = userCourses.filter(c => 
                (c.courseTitle && c.courseTitle.toLowerCase().includes(searchQuery)) || 
                (c.courseCode && c.courseCode.toLowerCase().includes(searchQuery))
            );
        }

        if (mongoose.models.User) {
            await Syllabus.populate(userCourses, { path: 'assignedInstructor' });
        }

        const courseIds = userCourses.map(c => c._id.toString());
        const approvals = await SyllabusApprovalStatus.find({ syllabusID: { $in: courseIds } });

        const formattedCourses = userCourses.map(c => {
            const idStr = c._id.toString();
            const draftRecord = approvals.find(a => a.syllabusID === idStr);

            return {
                id: idStr,
                code: c.courseCode,
                title: c.courseTitle,
                instructor: c.assignedInstructor 
                    ? `${c.assignedInstructor.firstName} ${c.assignedInstructor.lastName}` 
                    : "TBA", 
                img: (c.courseImage && c.courseImage.startsWith('data:')) 
                    ? c.courseImage 
                    : `https://picsum.photos/seed/${c._id}/400/200`,
                hasDraft: !!draftRecord, 
                status: draftRecord ? draftRecord.status : "No Syllabus Draft"
            };
        });

        res.render('courseOverview', { 
            courses: formattedCourses, 
            userId: userId, 
            searchQuery: req.query.search || '' 
        });
    } catch (error) {
        console.error("Database connection failed for teammate:", error);
        res.render('courseOverview', { courses: [], userId: req.params.userId, searchQuery: '' });
    }
});

coursesOverviewRouter.post('/:userId/add', upload.single('courseImage'), async (req, res) => {
    try {
        const userId = req.params.userId;
        const { courseCode, courseTitle, assignedInstructor } = req.body;

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
        
        if (assignedInstructor && assignedInstructor !== '') {
            syllabusData.assignedInstructor = assignedInstructor;
        }

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

coursesOverviewRouter.post('/:userId/delete/:courseId', async (req, res) => {
    try {
        const { userId, courseId } = req.params;
        await Syllabus.findByIdAndDelete(courseId);
        res.redirect(`/courses/${userId}`);
    } catch (error) {
        console.error('Error deleting course:', error);
        res.status(500).send("Error deleting course from database.");
    }
});

export { coursesOverviewRouter as default };