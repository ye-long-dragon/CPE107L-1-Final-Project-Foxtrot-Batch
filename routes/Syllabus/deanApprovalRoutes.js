import express from 'express';
import Syllabus from '../../models/Syllabus/syllabus.js';

const deanApprovalRouter = express.Router();

/* -----------------------------------------------------------------------
   GET /syllabus/dean/approve/:syllabusId  →  Dean Approval Detail Page
   ----------------------------------------------------------------------- */
deanApprovalRouter.get('/:syllabusId', async (req, res) => {
    const { syllabusId } = req.params;

    try {
        const syl = await Syllabus.findById(syllabusId).populate('assignedInstructor');

        if (syl) {
            return res.render('Syllabus/syllabusApprovalDean', {
                courseName: syl.courseTitle || 'Course Name',
                courseCode: syl.courseCode || 'Course Code',
                courseSection: syl.section || 'Course Section',
                academicYear: syl.academicYear || 'Academic Year',
                fileType: 'Syllabus Draft',
                syllabusId,
                currentPageCategory: 'syllabus'
            });
        }
    } catch (err) {
        console.error('Dean approval detail error:', err);
    }

    // Fallback dummy data
    res.render('Syllabus/syllabusApprovalDean', {
        courseName: '[COURSE NAME]',
        courseCode: '[COURSE CODE]',
        courseSection: '[COURSE SECTION]',
        academicYear: '[ACADEMIC YEAR]',
        fileType: 'Syllabus Draft',
        syllabusId,
        currentPageCategory: 'syllabus'
    });
});

export default deanApprovalRouter;
