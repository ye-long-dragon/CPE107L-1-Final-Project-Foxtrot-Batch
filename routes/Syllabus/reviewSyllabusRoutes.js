import express from 'express';

const reviewSyllabusRouter = express.Router();

reviewSyllabusRouter.get('/:syllabusId', async (req, res) => {
    res.render('Syllabus/reviewSyllabus', {
        courseName: '[COURSE NAME]',
        courseCode: '[COURSE CODE]',
        courseSection: '[COURSE SECTION]',
        academicYear: '[ACADEMIC YEAR]',
        fileType: '[FILE TYPE]',
        currentPageCategory: 'syllabus'
    });
});

export default reviewSyllabusRouter;
