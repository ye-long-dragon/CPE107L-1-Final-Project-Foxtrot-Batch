import {
    TLA_Main,   TLA_B1,   TLA_B2,
    Status_Main,Status_B1,Status_B2,
    Pre_Main,   Pre_B1,   Pre_B2,
    Post_Main,  Post_B1,  Post_B2
} from '../models/TLA/tlaModels.js';
import User from '../models/user.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PDF_TEMPLATE = join(__dirname, '../public/common/img/TLA_TEMPLATE_BLANK.pdf');

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  ROLE DEFINITIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// All non-faculty roles that participate in the review chain
const APPROVAL_ROLES = ['Technical', 'Program-Chair', 'Dean', 'HR', 'Admin', 'Super-Admin'];

// Roles that can view the approval sidebar (review mode)
const REVIEWER_ROLES = ['Technical', 'Program-Chair', 'Dean', 'HR', 'Admin', 'Super-Admin'];

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  MIDDLEWARE GUARDS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export function requireLogin(req, res, next) {
    if (!req.session?.user) return res.redirect('/login');
    next();
}

// Guard: only reviewer roles may access the approval pages
export function requireApprovalRole(req, res, next) {
    const role = req.session?.user?.role;
    if (!role || !REVIEWER_ROLES.includes(role)) {
        return res.status(403).send('Forbidden - you do not have permission to access this page.');
    }
    next();
}

// Guard: only HR (and Admin/Super-Admin) may archive
export function requireHRRole(req, res, next) {
    const role = req.session?.user?.role;
    if (!['HR', 'Admin', 'Super-Admin'].includes(role)) {
        return res.status(403).send('Forbidden - HR role required.');
    }
    next();
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  HELPERS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function stripId(doc) {
    const d = doc.toObject ? doc.toObject() : { ...doc };
    delete d._id;
    return d;
}

function actorName(user) {
    if (!user) return 'Unknown';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown';
}

// â”€â”€â”€ Determine step status labels for the UI tracker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Each step: "approved" | "ongoing" | "pending" | "rejected"
function buildApprovalSteps(tlaDoc, statusDoc) {
    const macroStatus = statusDoc?.status || 'Not Submitted';
    const stepDocs    = statusDoc || {};

    // â”€â”€ Helper: map DB step status into UI dot state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const dot = (stepStatus) => {
        if (!stepStatus) return 'pending';
        if (stepStatus === 'Approved' || stepStatus === 'Archived') return 'approved';
        if (stepStatus === 'Returned')  return 'rejected';
        if (stepStatus === 'Pending')   return 'ongoing';
        return 'pending';
    };

    // â”€â”€ Faculty step: submitted = tla left Draft state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const facultyDone = tlaDoc?.status && tlaDoc.status !== 'Draft';
    const facultyStep = facultyDone
        ? (macroStatus === 'Returned' ? 'rejected' : 'approved')
        : 'pending';

    // â”€â”€ Technical step â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let techStep = 'pending';
    if (facultyDone) {
        if (macroStatus === 'Not Submitted') techStep = 'pending';
        else if (['Pending'].includes(macroStatus)) techStep = 'ongoing';
        else techStep = dot(stepDocs.technical?.status);
    }

    // â”€â”€ Program Chair step â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let chairStep = 'pending';
    if (['Tech-Approved', 'Chair-Approved', 'Dean-Approved', 'Archived'].includes(macroStatus)) {
        chairStep = dot(stepDocs.programChair?.status);
        if (macroStatus === 'Tech-Approved' && !stepDocs.programChair?.status) chairStep = 'ongoing';
    }

    // â”€â”€ Dean step â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let deanStep = 'pending';
    if (['Chair-Approved', 'Dean-Approved', 'Archived'].includes(macroStatus)) {
        deanStep = dot(stepDocs.dean?.status);
        if (macroStatus === 'Chair-Approved' && !stepDocs.dean?.status) deanStep = 'ongoing';
    }

    // â”€â”€ HR step â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let hrStep = 'pending';
    if (['Dean-Approved', 'Archived'].includes(macroStatus)) {
        hrStep = dot(stepDocs.hr?.status);
        if (macroStatus === 'Dean-Approved' && !stepDocs.hr?.status) hrStep = 'ongoing';
    }

    return {
        faculty:      facultyStep,
        technical:    techStep,
        programChair: chairStep,
        dean:         deanStep,
        hr:           hrStep
    };
}

// â”€â”€â”€ Determine what action the current user can take â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Returns: null (no action) | "technical" | "programChair" | "dean" | "hr"
function activeStep(role, macroStatus) {
    if (role === 'Technical'     && macroStatus === 'Pending')       return 'technical';
    if (role === 'Program-Chair' && macroStatus === 'Tech-Approved') return 'programChair';
    if (role === 'Dean'          && macroStatus === 'Chair-Approved') return 'dean';
    if (role === 'HR'            && macroStatus === 'Dean-Approved') return 'hr';
    // Admin/Super-Admin can act at whatever the current active step is
    if (['Admin', 'Super-Admin'].includes(role)) {
        if (macroStatus === 'Pending')        return 'technical';
        if (macroStatus === 'Tech-Approved')  return 'programChair';
        if (macroStatus === 'Chair-Approved') return 'dean';
        if (macroStatus === 'Dean-Approved')  return 'hr';
    }
    return null;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  STATIC COURSE DATA (TODO: replace with Syllabus DB queries)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const STATIC_COURSES = [
    { syllabusId: '1', courseCode: 'SS067',  courseTitle: 'Life and Works of Mambo',         section: 'A301', term: '2nd Trimester', schoolYear: '2025-2026', hasBanner: false },
    { syllabusId: '2', courseCode: 'CS101',  courseTitle: 'Introduction to Computing',       section: 'B201', term: '2nd Trimester', schoolYear: '2025-2026', hasBanner: false },
    { syllabusId: '3', courseCode: 'CS201',  courseTitle: 'Data Structures and Algorithms',  section: 'A101', term: '2nd Trimester', schoolYear: '2025-2026', hasBanner: false },
    { syllabusId: '4', courseCode: 'GE104',  courseTitle: 'Understanding the Self',          section: 'C102', term: '1st Trimester', schoolYear: '2025-2026', hasBanner: false },
    { syllabusId: '5', courseCode: 'IT301',  courseTitle: 'Web Systems and Technologies',    section: 'A301', term: '1st Trimester', schoolYear: '2025-2026', hasBanner: false },
    { syllabusId: '6', courseCode: 'GE101',  courseTitle: 'Mathematics in the Modern World', section: 'B102', term: '2nd Trimester', schoolYear: '2025-2026', hasBanner: false },
    { syllabusId: '7', courseCode: 'CS301',  courseTitle: 'Operating Systems',               section: 'A201', term: '1st Trimester', schoolYear: '2025-2026', hasBanner: false },
    { syllabusId: '8', courseCode: 'IS201',  courseTitle: 'Information Management',          section: 'B301', term: '2nd Trimester', schoolYear: '2025-2026', hasBanner: false },
];

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  COURSES PAGE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function getCourses(req, res) {
    try {
        const user = req.session.user;

        if (user?.role === 'HR') {
            return res.redirect('/tla/hr');
        }

        if (APPROVAL_ROLES.includes(user?.role)) {
            return res.redirect('/tla/admin-overview');
        }

        res.render('TLA/tlaCourses', {
            currentPageCategory: 'tla',
            user,
            courses: STATIC_COURSES
        });
    } catch (error) {
        console.error('getCourses error:', error);
        res.status(500).send('Server error');
    }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  DASHBOARD  (Faculty's own TLA weeks)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function getDashboard(req, res) {
    try {
        const userID = req.session.user.id;
        const tlas   = await TLA_Main.find({ userID }).sort({ weekNumber: 1 });
        const tlaIDs = tlas.map(t => t._id);
        const statuses = await Status_Main.find({ tlaID: { $in: tlaIDs } });

        const statusMap = {};
        for (const s of statuses) statusMap[s.tlaID.toString()] = s.status;

        const weeks = tlas.map(t => ({
            _id:             t._id,
            weekNumber:      t.weekNumber,
            courseCode:      t.courseCode,
            section:         t.section,
            dateofDigitalDay:t.dateofDigitalDay,
            status:          statusMap[t._id.toString()] || 'Not Submitted'
        }));

        res.render('TLA/tlaDashboard', {
            currentPageCategory: 'tla',
            user: req.session.user,
            weeks
        });
    } catch (error) {
        console.error('getDashboard error:', error);
        res.status(500).send('Server error');
    }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  TLA FORM (GET new / GET existing)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export function getNewForm(req, res) {
    res.render('TLA/tlaForm', {
        currentPageCategory: 'tla',
        user: req.session.user,
        tla: null,
        preDigital: null,
        postDigital: null,
        status: null
    });
}

export async function getFormById(req, res) {
    try {
        const tla = await TLA_Main.findById(req.params.id);
        if (!tla) return res.status(404).send('TLA not found');

        if (tla.userID.toString() !== req.session.user.id) {
            return res.status(403).send('Forbidden');
        }

        const [preDigital, postDigital, status] = await Promise.all([
            Pre_Main.findOne({ tlaID: tla._id }),
            Post_Main.findOne({ tlaID: tla._id }),
            Status_Main.findOne({ tlaID: tla._id })
        ]);

        res.render('TLA/tlaForm', {
            currentPageCategory: 'tla',
            user: req.session.user,
            tla,
            preDigital:  preDigital  || null,
            postDigital: postDigital || null,
            status:      status      || null
        });
    } catch (error) {
        console.error('getFormById error:', error);
        res.status(500).send('Server error');
    }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  TLA FORM (POST create)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function createTLA(req, res) {
    try {
        const {
            courseCode, section, dateofDigitalDay, facultyFacilitating,
            courseOutcomes, mediatingOutcomes, weekNumber,
            pre_moIloCode, pre_teacherLearningActivity, pre_lmsDigitalTool, pre_assessment,
            action
        } = req.body;

        const userID    = req.session.user.id;
        const tlaStatus = action === 'submit' ? 'Pending' : 'Draft';

        const newTLA = await TLA_Main.create({
            courseCode, section, dateofDigitalDay, facultyFacilitating,
            courseOutcomes, mediatingOutcomes,
            weekNumber: weekNumber || null,
            userID, status: tlaStatus
        });
        const tlaBackup = stripId(newTLA);
        await Promise.all([ TLA_B1.create(tlaBackup), TLA_B2.create(tlaBackup) ]);

        const preDoc = await Pre_Main.create({
            tlaID: newTLA._id,
            moIloCode:               pre_moIloCode,
            teacherLearningActivity: pre_teacherLearningActivity,
            lmsDigitalTool:          pre_lmsDigitalTool,
            assessment:              pre_assessment
        });
        await Promise.all([ Pre_B1.create(stripId(preDoc)), Pre_B2.create(stripId(preDoc)) ]);

        const macroStatus = action === 'submit' ? 'Pending' : 'Not Submitted';
        const statusDoc = await Status_Main.create({
            tlaID:  newTLA._id,
            status: macroStatus
        });
        await Promise.all([ Status_B1.create(stripId(statusDoc)), Status_B2.create(stripId(statusDoc)) ]);

        res.redirect('/tla/overview');
    } catch (error) {
        console.error('createTLA error:', error);
        res.status(500).send('Server error');
    }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  TLA FORM (POST update)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function updateTLA(req, res) {
    try {
        const { id } = req.params;
        const {
            courseCode, section, dateofDigitalDay, facultyFacilitating,
            courseOutcomes, mediatingOutcomes, weekNumber,
            pre_moIloCode, pre_teacherLearningActivity, pre_lmsDigitalTool, pre_assessment,
            post_moIloCode, post_participantTurnout, post_assessmentResults, post_remarks,
            action
        } = req.body;

        const tla = await TLA_Main.findById(id);
        if (!tla) return res.status(404).send('TLA not found');

        if (tla.userID.toString() !== req.session.user.id) {
            return res.status(403).send('Forbidden');
        }

        if (tla.status === 'Archived') {
            return res.status(403).send('Cannot edit an Archived TLA');
        }

        const isPostSubmit = action === 'submit-post';
        const isSubmit     = action === 'submit';
        const isDraft      = action === 'draft';
        const isApproved   = ['Approved', 'Dean-Approved', 'Chair-Approved', 'Tech-Approved', 'Returned'].includes(tla.status);

        let tlaStatus = tla.status;
        if (isDraft && !isApproved)  tlaStatus = 'Draft';
        if (isSubmit && !isApproved) tlaStatus = 'Pending';

        if (!isPostSubmit) {
            const tlaUpdate = {
                courseCode, section, dateofDigitalDay, facultyFacilitating,
                courseOutcomes, mediatingOutcomes,
                weekNumber: weekNumber || null,
                status: tlaStatus
            };
            await Promise.all([
                TLA_Main.findByIdAndUpdate(id, tlaUpdate),
                TLA_B1.findByIdAndUpdate(id, tlaUpdate),
                TLA_B2.findByIdAndUpdate(id, tlaUpdate)
            ]);

            const preUpdate = {
                tlaID: id,
                moIloCode:               pre_moIloCode,
                teacherLearningActivity: pre_teacherLearningActivity,
                lmsDigitalTool:          pre_lmsDigitalTool,
                assessment:              pre_assessment
            };
            await Promise.all([
                Pre_Main.findOneAndUpdate({ tlaID: id }, preUpdate, { upsert: true }),
                Pre_B1.findOneAndUpdate({ tlaID: id }, preUpdate, { upsert: true }),
                Pre_B2.findOneAndUpdate({ tlaID: id }, preUpdate, { upsert: true })
            ]);
        }

        if (isSubmit || isPostSubmit || isApproved) {
            const postUpdate = {
                tlaID: id,
                moIloCode:         post_moIloCode,
                participantTurnout:post_participantTurnout,
                assessmentResults: post_assessmentResults,
                remarks:           post_remarks
            };
            await Promise.all([
                Post_Main.findOneAndUpdate({ tlaID: id }, postUpdate, { upsert: true }),
                Post_B1.findOneAndUpdate({ tlaID: id }, postUpdate, { upsert: true }),
                Post_B2.findOneAndUpdate({ tlaID: id }, postUpdate, { upsert: true })
            ]);
        }

        // If faculty re-submits after a Returned verdict, reset the macro status to Pending
        // so it re-enters the Technical queue
        if (isSubmit && tlaStatus === 'Pending') {
            const statusReset = {
                status:     'Pending',
                // Clear old step data so reviewers start fresh
                technical:    { status: 'Pending', approvedBy: '', approvalDate: null, remarks: '' },
                programChair: { status: 'Pending', approvedBy: '', approvalDate: null, remarks: '' },
                dean:         { status: 'Pending', approvedBy: '', approvalDate: null, remarks: '' },
                hr:           { status: 'Pending', approvedBy: '', approvalDate: null, remarks: '' }
            };
            await Promise.all([
                Status_Main.findOneAndUpdate({ tlaID: id }, statusReset, { upsert: true }),
                Status_B1.findOneAndUpdate({ tlaID: id }, statusReset, { upsert: true }),
                Status_B2.findOneAndUpdate({ tlaID: id }, statusReset, { upsert: true })
            ]);
        } else if (isDraft && !isApproved) {
            const statusUpdate = { status: 'Not Submitted' };
            await Promise.all([
                Status_Main.findOneAndUpdate({ tlaID: id }, statusUpdate, { upsert: true }),
                Status_B1.findOneAndUpdate({ tlaID: id }, statusUpdate, { upsert: true }),
                Status_B2.findOneAndUpdate({ tlaID: id }, statusUpdate, { upsert: true })
            ]);
        }

        res.redirect('/tla/overview');
    } catch (error) {
        console.error('updateTLA error:', error);
        res.status(500).send('Server error');
    }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  OVERVIEW â€” Faculty's own weekly cards
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function getOverview(req, res) {
    try {
        const userID   = req.session.user.id;
        const userRole = req.session.user.role;

        if (userRole === 'HR') {
            return res.redirect('/tla/hr');
        }

        if (APPROVAL_ROLES.includes(userRole)) {
            return res.redirect('/tla/admin-overview');
        }

        const sid   = req.params.syllabusId;
        const found = sid ? STATIC_COURSES.find(c => c.syllabusId === sid) : null;

        const courseInfo = {
            syllabusId: found?.syllabusId  || null,
            courseCode: found?.courseCode  || 'SS067',
            courseTitle:found?.courseTitle || 'Life and Works of Mambo',
            section:    found?.section     || 'A301',
            schoolYear: found?.schoolYear  || '2025-2026',
            term:       found?.term        || '2nd Trimester'
        };

        const tlas = await TLA_Main.find({ userID }).sort({ weekNumber: 1 });
        const tlaIDs = tlas.map(t => t._id);
        const statuses = await Status_Main.find({ tlaID: { $in: tlaIDs } });

        const statusMap = {};
        for (const s of statuses) statusMap[s.tlaID.toString()] = s.status;

        const weekMap = {};
        for (const t of tlas) {
            if (t.weekNumber) {
                weekMap[t.weekNumber] = {
                    _id:    t._id,
                    status: statusMap[t._id.toString()] || 'Not Submitted'
                };
            }
        }

        const weeks = [];
        for (let w = 1; w <= 14; w++) {
            if (weekMap[w]) {
                weeks.push({ weekNumber: w, _id: weekMap[w]._id, status: weekMap[w].status });
            } else {
                weeks.push({ weekNumber: w, _id: null, status: 'Not Submitted' });
            }
        }

        const isApprover = APPROVAL_ROLES.includes(userRole);
        const viewName   = isApprover ? 'TLA/tlaOverviewApproval' : 'TLA/tlaOverview';

        res.render(viewName, {
            currentPageCategory: 'tla',
            user: req.session.user,
            weeks,
            courseInfo
        });
    } catch (error) {
        console.error('getOverview error:', error);
        res.status(500).send('Server error');
    }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  ADMIN / APPROVER SUBMISSION OVERVIEW
//  GET /tla/admin-overview  â€” lists ALL submitted TLAs for reviewer roles
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function getAdminOverview(req, res) {
    try {
        const role   = req.session.user.role;
        const userID = req.session.user.id;

        // Determine which macro statuses this role can act on
        const roleStatusFilter = {
            'Technical':     ['Pending'],
            'Program-Chair': ['Tech-Approved'],
            'Dean':          ['Chair-Approved'],
            'HR':            ['Dean-Approved'],
            'Admin':         ['Pending', 'Tech-Approved', 'Chair-Approved', 'Dean-Approved', 'Returned'],
            'Super-Admin':   ['Pending', 'Tech-Approved', 'Chair-Approved', 'Dean-Approved', 'Returned']
        };
        const allowedStatuses = roleStatusFilter[role] || [];

        // Fetch approval status records matching this role's scope
        const statusDocs = await Status_Main.find({
            status: { $in: allowedStatuses }
        }).sort({ updatedAt: -1 });

        const tlaIDs = statusDocs.map(s => s.tlaID);
        const tlas   = await TLA_Main.find({ _id: { $in: tlaIDs } });

        // Fetch faculty user info for display
        const userIDs = [...new Set(tlas.map(t => t.userID?.toString()))];
        const users   = await User.find({ _id: { $in: userIDs } }, 'firstName lastName email');
        const userMap = {};
        for (const u of users) userMap[u._id.toString()] = u;

        // Build submission cards
        const statusMap = {};
        for (const s of statusDocs) statusMap[s.tlaID.toString()] = s;

        const submissions = tlas.map(t => {
            const sd      = statusMap[t._id.toString()];
            const faculty = userMap[t.userID?.toString()];
            return {
                _id:         t._id,
                courseCode:  t.courseCode,
                section:     t.section,
                weekNumber:  t.weekNumber,
                dateofDigitalDay: t.dateofDigitalDay,
                facultyName: faculty ? `${faculty.firstName} ${faculty.lastName}` : 'â€”',
                macroStatus: sd?.status || 'â€”',
                updatedAt:   sd?.updatedAt || t.updatedAt
            };
        });

        res.render('TLA/tlaAdminOverview', {
            currentPageCategory: 'tla',
            user: req.session.user,
            submissions,
            role
        });
    } catch (error) {
        console.error('getAdminOverview error:', error);
        res.status(500).send('Server error');
    }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  HR DASHBOARD  â€” all TLAs ready for archiving (Dean-Approved) + already archived
//  GET /tla/hr
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function getHRDashboard(req, res) {
    try {
        // Fetch all status docs of interest to HR
        const statusDocs = await Status_Main.find({
            status: { $in: ['Dean-Approved', 'Archived'] }
        }).sort({ updatedAt: -1 });

        const tlaIDs = statusDocs.map(s => s.tlaID);
        const tlas   = await TLA_Main.find({ _id: { $in: tlaIDs } });

        const userIDs = [...new Set(tlas.map(t => t.userID?.toString()))];
        const users   = await User.find({ _id: { $in: userIDs } }, 'firstName lastName email department');
        const userMap = {};
        for (const u of users) userMap[u._id.toString()] = u;

        const statusMap = {};
        for (const s of statusDocs) statusMap[s.tlaID.toString()] = s;

        const toArchive = [];
        const archived  = [];

        for (const t of tlas) {
            const sd      = statusMap[t._id.toString()];
            const faculty = userMap[t.userID?.toString()];
            const entry   = {
                _id:         t._id,
                courseCode:  t.courseCode,
                section:     t.section,
                weekNumber:  t.weekNumber,
                facultyName: faculty ? `${faculty.firstName} ${faculty.lastName}` : 'â€”',
                department:  faculty?.department || 'â€”',
                deanApprovedAt:  sd?.dean?.approvalDate || null,
                hrArchivedAt:    sd?.hr?.approvalDate   || null,
                macroStatus: sd?.status || 'â€”'
            };
            if (sd?.status === 'Archived') archived.push(entry);
            else                           toArchive.push(entry);
        }

        res.render('TLA/tlaHRDashboard', {
            currentPageCategory: 'tla',
            user: req.session.user,
            toArchive,
            archived
        });
    } catch (error) {
        console.error('getHRDashboard error:', error);
        res.status(500).send('Server error');
    }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  APPROVAL PAGE  (GET)
//  GET /tla/approval/:id
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function getApprovalPage(req, res) {
    try {
        const tlaID   = req.params.id;
        const role    = req.session.user.role;

        // â”€â”€ No ID â†’ static placeholder preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        if (!tlaID) {
            return res.render('TLA/tlaApproval', {
                currentPageCategory: 'tla',
                user:             req.session.user,
                courseName:       '[COURSE NAME]',
                courseCode:       '[COURSE CODE]',
                section:          '[COURSE SECTION]',
                academicYear:     '[ACADEMIC YEAR]',
                fileType:         '[FILE TYPE]',
                tla:              null,
                preDigital:       null,
                postDigital:      null,
                facultyName:      'â€”',
                approvalSteps:    null,
                approvalStatusId: null,
                currentStatus:    'Pending',
                macroStatus:      'Pending',
                existingComment:  '',
                signatureUrl:     null,
                activeStep:       null,
                stepData:         null
            });
        }

        const tla = await TLA_Main.findById(tlaID);
        if (!tla) return res.status(404).send('TLA not found');

        const [preDigital, postDigital, approvalStatus] = await Promise.all([
            Pre_Main.findOne({ tlaID: tla._id }),
            Post_Main.findOne({ tlaID: tla._id }),
            Status_Main.findOne({ tlaID: tla._id })
        ]);

        const approvalSteps  = buildApprovalSteps(tla, approvalStatus);
        const macroStatus    = approvalStatus?.status || 'Not Submitted';
        const userActiveStep = activeStep(role, macroStatus);

        // â”€â”€ Pull this role's current step data for prefilling â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        let stepData = null;
        if (userActiveStep && approvalStatus?.[userActiveStep]) {
            stepData = approvalStatus[userActiveStep];
        }

        res.render('TLA/tlaApproval', {
            currentPageCategory: 'tla',
            user:             req.session.user,
            courseName:       tla.courseCode || '[COURSE NAME]',
            courseCode:       tla.courseCode || '[COURSE CODE]',
            section:          tla.section    || '[COURSE SECTION]',
            academicYear:     '2025-2026',
            fileType:         'TLA',
            tla,
            preDigital:       preDigital  || null,
            postDigital:      postDigital || null,
            facultyName:      tla.facultyFacilitating || 'â€”',
            approvalSteps,
            approvalStatusId: approvalStatus ? approvalStatus._id : null,
            currentStatus:    approvalStatus ? approvalStatus.status : 'Not Submitted',
            macroStatus,
            existingComment:  stepData?.remarks || '',
            signatureUrl:     null,
            activeStep:       userActiveStep,  // null = read-only for this role
            stepData
        });
    } catch (error) {
        console.error('getApprovalPage error:', error);
        res.status(500).send('Server error');
    }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  APPROVAL ACTION  (POST)
//  POST /tla/approval/:id
//  Body: { comment, verdict ("Approved"|"Returned"), action ("submit"|"draft") }
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function postApprovalAction(req, res) {
    try {
        const tlaID = req.params.id;
        const { comment, verdict, action } = req.body;
        const role   = req.session.user.role;
        const actor  = actorName(req.session.user);

        const tla = await TLA_Main.findById(tlaID);
        if (!tla) return res.status(404).json({ error: 'TLA not found' });

        const statusDoc = await Status_Main.findOne({ tlaID }) ||
                          await Status_Main.create({ tlaID, status: 'Not Submitted' });

        const macroNow  = statusDoc.status;
        const step      = activeStep(role, macroNow);

        // â”€â”€ Draft save: just store the comment without advancing the chain â”€â”€
        if (action === 'draft' && step) {
            const draftUpdate = {
                [`${step}.remarks`]: comment || ''
            };
            await Promise.all([
                Status_Main.findOneAndUpdate({ tlaID }, { $set: draftUpdate }),
                Status_B1.findOneAndUpdate({ tlaID },  { $set: draftUpdate }),
                Status_B2.findOneAndUpdate({ tlaID },  { $set: draftUpdate })
            ]);

            if (req.headers['content-type']?.includes('application/json')) {
                return res.json({ success: true, message: 'Draft saved.' });
            }
            return res.redirect('/tla/approval/' + tlaID);
        }

        // â”€â”€ Actual verdict submission â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        if (action === 'submit' && step) {
            if (!verdict || !['Approved', 'Returned'].includes(verdict)) {
                const msg = 'Invalid verdict. Must be "Approved" or "Returned".';
                if (req.headers['content-type']?.includes('application/json')) {
                    return res.status(400).json({ error: msg });
                }
                return res.status(400).send(msg);
            }

            // Compute next macro status
            let nextMacro = macroNow;
            let nextTlaStatus = tla.status;

            if (verdict === 'Returned') {
                nextMacro     = 'Returned';
                nextTlaStatus = 'Returned';
            } else {
                // Approved â€” advance the chain
                const advanceMap = {
                    technical:    'Tech-Approved',
                    programChair: 'Chair-Approved',
                    dean:         'Dean-Approved',
                    hr:           'Archived'
                };
                nextMacro = advanceMap[step] || macroNow;

                if (step === 'hr') {
                    nextTlaStatus = 'Archived';
                } else if (step === 'dean') {
                    nextTlaStatus = 'Dean-Approved';
                } else {
                    nextTlaStatus = tla.status; // keep faculty-visible status until final
                }
            }

            const now         = new Date();
            const stepUpdate  = {
                [`${step}.status`]:      verdict,
                [`${step}.approvedBy`]:  actor,
                [`${step}.approvalDate`]:now,
                [`${step}.remarks`]:     comment || '',
                status: nextMacro,
                // Legacy flat fields
                approvedBy:   actor,
                approvalDate: now,
                remarks:      comment || ''
            };

            await Promise.all([
                Status_Main.findOneAndUpdate({ tlaID }, { $set: stepUpdate }, { upsert: true }),
                Status_B1.findOneAndUpdate({ tlaID },  { $set: stepUpdate }, { upsert: true }),
                Status_B2.findOneAndUpdate({ tlaID },  { $set: stepUpdate }, { upsert: true }),
                TLA_Main.findByIdAndUpdate(tlaID, { status: nextTlaStatus }),
                TLA_B1.findByIdAndUpdate(tlaID,   { status: nextTlaStatus }),
                TLA_B2.findByIdAndUpdate(tlaID,   { status: nextTlaStatus })
            ]);

            if (req.headers['content-type']?.includes('application/json')) {
                return res.json({ success: true, status: nextMacro, verdict });
            }
            return res.redirect('/tla/approval/' + tlaID);
        }

        // â”€â”€ Fallback: no matching action â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        if (req.headers['content-type']?.includes('application/json')) {
            return res.status(400).json({ error: 'Invalid action or role not authorised for current step.' });
        }
        res.redirect('/tla/approval/' + tlaID);

    } catch (error) {
        console.error('postApprovalAction error:', error);
        if (req.headers['content-type']?.includes('application/json')) {
            return res.status(500).json({ error: 'Server error' });
        }
        res.status(500).send('Server error');
    }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  HR ARCHIVE ACTION  (POST)
//  POST /tla/hr/archive/:id  â€” HR archives a Dean-Approved TLA
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function postHRArchive(req, res) {
    try {
        const tlaID  = req.params.id;
        const actor  = actorName(req.session.user);
        const { comment } = req.body;
        const now    = new Date();

        const stepUpdate = {
            'hr.status':      'Archived',
            'hr.approvedBy':  actor,
            'hr.approvalDate':now,
            'hr.remarks':     comment || '',
            status:           'Archived',
            approvedBy:       actor,
            approvalDate:     now,
            remarks:          comment || ''
        };

        await Promise.all([
            Status_Main.findOneAndUpdate({ tlaID }, { $set: stepUpdate }, { upsert: true }),
            Status_B1.findOneAndUpdate({ tlaID },  { $set: stepUpdate }, { upsert: true }),
            Status_B2.findOneAndUpdate({ tlaID },  { $set: stepUpdate }, { upsert: true }),
            TLA_Main.findByIdAndUpdate(tlaID, { status: 'Archived' }),
            TLA_B1.findByIdAndUpdate(tlaID,   { status: 'Archived' }),
            TLA_B2.findByIdAndUpdate(tlaID,   { status: 'Archived' })
        ]);

        res.redirect('/tla/hr');
    } catch (error) {
        console.error('postHRArchive error:', error);
        res.status(500).send('Server error');
    }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  PDF GENERATION
//  POST /tla/form/generate-docx
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function generateDocx(req, res) {
    try {
        const b    = req.body;
        const user = req.session.user;
        const faculty = b.facultyFacilitating ||
                        (user ? `${user.firstName} ${user.lastName}` : '');

        const templateBytes = readFileSync(PDF_TEMPLATE);
        const pdfDoc = await PDFDocument.load(templateBytes);
        const page   = pdfDoc.getPages()[0];
        const font   = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const black  = rgb(0, 0, 0);

        const draw = (txt, x, y, { size = 9, f = font, color = black, maxWidth } = {}) => {
            if (!txt) return;
            if (maxWidth) {
                while (f.widthOfTextAtSize(txt, size) > maxWidth && txt.length > 1) {
                    txt = txt.slice(0, -1);
                }
            }
            page.drawText(txt, { x, y, size, font: f, color });
        };

        const drawWrapped = (txt, x, y, cellW, { size = 8, lineH = 10, f = font } = {}) => {
            if (!txt) return;
            const words = txt.split(/\s+/);
            let line = '';
            let curY = y;
            for (const word of words) {
                const test = line ? line + ' ' + word : word;
                if (f.widthOfTextAtSize(test, size) > cellW - 6) {
                    if (line) { page.drawText(line, { x, y: curY, size, font: f, color: black }); curY -= lineH; }
                    line = word;
                } else {
                    line = test;
                }
            }
            if (line) page.drawText(line, { x, y: curY, size, font: f, color: black });
        };

        draw(b.courseCode || '',       113, 737, { size: 9, maxWidth: 105 });
        draw(b.section || '',          290, 737, { size: 9, maxWidth: 110 });
        draw(b.dateofDigitalDay || '', 410, 732, { size: 9, maxWidth: 145 });
        draw(faculty,                  250, 718, { size: 9, maxWidth: 305 });
        drawWrapped(b.courseOutcomes || '',    148, 705, 407, { size: 8, lineH: 9 });
        drawWrapped(b.mediatingOutcomes || '',  56, 671, 498, { size: 8, lineH: 9 });

        const preY = 585;
        drawWrapped(b.pre_moIloCode || '',               55, preY, 65,  { size: 8 });
        drawWrapped(b.pre_teacherLearningActivity || '', 128, preY, 195, { size: 8 });
        drawWrapped(b.pre_lmsDigitalTool || '',          331, preY, 103, { size: 8 });
        drawWrapped(b.pre_assessment || '',              441, preY, 113, { size: 8 });

        const postY = 305;
        drawWrapped(b.post_moIloCode || '',          55,  postY, 65,  { size: 8 });
        drawWrapped(b.post_participantTurnout || '', 128, postY, 195, { size: 8 });
        drawWrapped(b.post_assessmentResults || '',  331, postY, 103, { size: 8 });
        drawWrapped(b.post_remarks || '',            441, postY, 113, { size: 8 });

        const pdfBytes = await pdfDoc.save();
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="TLA_Report.pdf"'
        });
        res.send(Buffer.from(pdfBytes));
    } catch (err) {
        console.error('generateDocx error:', err);
        res.status(500).send('Failed to generate PDF');
    }
}
