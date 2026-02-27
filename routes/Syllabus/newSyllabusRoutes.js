import express from 'express';

const newSyllabusRoutes = express.Router();

newSyllabusRoutes.get('/', (req, res) => {
    res.render('Syllabus/newSyllabus', {currentPageCategory: "syllabus"});
});

export default newSyllabusRoutes;