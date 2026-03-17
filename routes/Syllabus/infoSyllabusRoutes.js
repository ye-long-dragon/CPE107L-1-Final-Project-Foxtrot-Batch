import express from 'express';

const infoSyllabusRoutes = express.Router();

import Syllabus from '../../models/Syllabus/syllabus.js';

infoSyllabusRoutes.get('/:syllabusId', async (req, res) => {
    try {
        const syllabusId = req.params.syllabusId;
        const syl = await Syllabus.findById(syllabusId);
        
        res.render('Syllabus/infoSyllabus', { 
            currentPageCategory: "syllabus",
            syllabusId: syllabusId,
            courseCode: syl ? syl.courseCode : '',
            courseTitle: syl ? syl.courseTitle : ''
        });
    } catch (err) {
        console.error("Error fetching syllabus for info page:", err);
        res.render('Syllabus/infoSyllabus', { 
            currentPageCategory: "syllabus",
            syllabusId: req.params.syllabusId,
            courseCode: '',
            courseTitle: ''
        });
    }
});

export default infoSyllabusRoutes;