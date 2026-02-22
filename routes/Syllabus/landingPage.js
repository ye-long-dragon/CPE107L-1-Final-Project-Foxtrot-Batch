import express from 'express';

const landingPageRouter = express.Router();

landingPageRouter.get('/', (req, res) => {
    res.render('Syllabus/landingPage', {currentPageCategory: "syllabus"});
});

export default landingPageRouter;