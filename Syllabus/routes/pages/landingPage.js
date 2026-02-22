import express from 'express';

const landingPageRouter = express.Router();

landingPageRouter.get('/', (req, res) => {
    res.render('landingPage');
});

export { landingPageRouter as default };