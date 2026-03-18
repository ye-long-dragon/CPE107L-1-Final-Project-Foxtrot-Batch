import express from 'express';
import Syllabus from '../../models/Syllabus/syllabus.js';
import CourseOutcomes from '../../models/Syllabus/courseOutcomes.js';
import CourseMapping from '../../models/Syllabus/courseMapping.js';
import SyllabusApprovalStatus from '../../models/Syllabus/syllabusApprovalStatus.js';

const previewRoutes = express.Router();

previewRoutes.get('/:syllabusId', async (req, res) => {
    try {
        const syllabusId = req.params.syllabusId;
        const syl = await Syllabus.findById(syllabusId).populate('assignedInstructor');
        const outcomes = await CourseOutcomes.find({ syllabusID: syllabusId });
        const mapping = await CourseMapping.find({ syllabusID: syllabusId });
        const approval = await SyllabusApprovalStatus.findOne({ syllabusID: syllabusId });
        
        res.render('Syllabus/previewSyllabus', { 
            currentPageCategory: "syllabus",
            syllabusId: syllabusId,
            courseCode: syl ? syl.courseCode : '',
            courseTitle: syl ? syl.courseTitle : '',
            syl: syl || {},
            outcomes: outcomes || [],
            mapping: mapping || [],
            status: approval ? approval.status : 'Archived'
        });
    } catch (err) {
        console.error("Error fetching syllabus for preview page:", err);
        res.status(500).send("Error loading preview.");
    }
});

export default previewRoutes;
