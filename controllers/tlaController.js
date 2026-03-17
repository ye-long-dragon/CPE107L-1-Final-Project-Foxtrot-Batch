import {
    TLA_Main,   TLA_B1,   TLA_B2,
    Status_Main,Status_B1,Status_B2,
    Pre_Main,   Pre_B1,   Pre_B2,
    Post_Main,  Post_B1,  Post_B2
} from '../models/TLA/tlaModels.js';
import Syllabus from '../models/Syllabus/syllabus.js';
import SyllabusApprovalStatus from '../models/Syllabus/syllabusApprovalStatus.js';
import userSchema from '../models/user.js';
import { mainDB } from '../database/mongo-dbconnect.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PDF_TEMPLATE = join(__dirname, '../templates/TLA_TEMPLATE_BLANK.pdf');
const User = mainDB.model("User", userSchema);

// ===============================================================================
//  ROLE DEFINITIONS
// ===============================================================================

// All non-faculty roles that participate in the review chain (also used as reviewer check)
const APPROVAL_ROLES = [
    'Technical', 'Program-Chair', 'Practicum-Coordinator',
    'Dean', 'VPAA', 'HR', 'HRMO', 'Admin', 'Super-Admin'
];

// ===============================================================================
//  MIDDLEWARE GUARDS
// ===============================================================================

export function requireLogin(req, res, next) {
    if (!req.session?.user) return res.redirect('/login');
    next();
}

// Guard: only reviewer roles may access the approval pages
export function requireApprovalRole(req, res, next) {
    const role = req.session?.user?.role;
    if (!role || !APPROVAL_ROLES.includes(role)) {
        return res.status(403).send('Forbidden - you do not have permission to access this page.');
    }
    next();
}

// Guard: only HR/HRMO (and Admin/Super-Admin) may archive
export function requireHRRole(req, res, next) {
    const role = req.session?.user?.role;
    if (!['HR', 'HRMO', 'Admin', 'Super-Admin'].includes(role)) {
        return res.status(403).send('Forbidden - HR role required.');
    }
    next();
}

// ===============================================================================
//  HELPERS
// ===============================================================================

function stripId(doc) {
    const d = doc.toObject ? doc.toObject() : { ...doc };
    delete d._id;
    return d;
}

function actorName(user) {
    if (!user) return 'Unknown';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown';
}

async function resolveOwnedSyllabusId(userId, syllabusId, courseCode) {
    if (syllabusId) {
        const byId = await Syllabus.findOne({
            _id: syllabusId,
            $or: [{ assignedInstructor: userId }, { userID: userId }]
        });
        if (byId) return byId._id.toString();
    }

    if (courseCode) {
        const byCourse = await Syllabus.findOne({
            courseCode,
            $or: [{ assignedInstructor: userId }, { userID: userId }]
        });
        if (byCourse) return byCourse._id.toString();
    }

    return '';
}

// --- Determine step status labels for the UI tracker ------------------------
// Each step: "approved" | "ongoing" | "pending" | "rejected"
// Chain: Faculty → Technical → Program Chair → Practicum Coordinator → Dean → VPAA → HR/HRMO
function buildApprovalSteps(tlaDoc, statusDoc) {
    const macroStatus = statusDoc?.status || 'Not Submitted';
    const stepDocs    = statusDoc || {};

    const dot = (stepStatus) => {
        if (!stepStatus) return 'pending';
        if (stepStatus === 'Approved' || stepStatus === 'Archived') return 'approved';
        if (stepStatus === 'Returned')  return 'rejected';
        if (stepStatus === 'Pending')   return 'ongoing';
        return 'pending';
    };

    // Faculty step
    const facultyDone = tlaDoc?.status && tlaDoc.status !== 'Draft';
    const facultyStep = facultyDone
        ? (macroStatus === 'Returned' ? 'rejected' : 'approved')
        : 'pending';

    // Technical step
    let techStep = 'pending';
    if (facultyDone) {
        if (macroStatus === 'Not Submitted') techStep = 'pending';
        else if (macroStatus === 'Pending') techStep = 'ongoing';
        else techStep = dot(stepDocs.technical?.status);
    }

    // Program Chair step
    let chairStep = 'pending';
    if (['Tech-Approved', 'Chair-Approved', 'Practicum-Approved', 'Dean-Approved', 'VPAA-Noted', 'Archived'].includes(macroStatus)) {
        chairStep = dot(stepDocs.programChair?.status);
        if (macroStatus === 'Tech-Approved' && !stepDocs.programChair?.status) chairStep = 'ongoing';
    }

    // Practicum Coordinator step
    let practicumStep = 'pending';
    if (['Chair-Approved', 'Practicum-Approved', 'Dean-Approved', 'VPAA-Noted', 'Archived'].includes(macroStatus)) {
        practicumStep = dot(stepDocs.practicumCoordinator?.status);
        if (macroStatus === 'Chair-Approved' && !stepDocs.practicumCoordinator?.status) practicumStep = 'ongoing';
    }

    // Dean step
    let deanStep = 'pending';
    if (['Practicum-Approved', 'Dean-Approved', 'VPAA-Noted', 'Archived'].includes(macroStatus)) {
        deanStep = dot(stepDocs.dean?.status);
        if (macroStatus === 'Practicum-Approved' && !stepDocs.dean?.status) deanStep = 'ongoing';
    }

    // VPAA step
    let vpaaStep = 'pending';
    if (['Dean-Approved', 'VPAA-Noted', 'Archived'].includes(macroStatus)) {
        vpaaStep = dot(stepDocs.vpaa?.status);
        if (macroStatus === 'Dean-Approved' && !stepDocs.vpaa?.status) vpaaStep = 'ongoing';
    }

    // HR/HRMO step
    let hrStep = 'pending';
    if (['VPAA-Noted', 'Archived'].includes(macroStatus)) {
        hrStep = dot(stepDocs.hr?.status);
        if (macroStatus === 'VPAA-Noted' && !stepDocs.hr?.status) hrStep = 'ongoing';
    }

    return {
        faculty:              facultyStep,
        technical:            techStep,
        programChair:         chairStep,
        practicumCoordinator: practicumStep,
        dean:                 deanStep,
        vpaa:                 vpaaStep,
        hr:                   hrStep
    };
}

// --- Determine what action the current user can take ------------------------
// Returns: null (no action) | step key string
// Chain: Technical → Program-Chair → Practicum-Coordinator → Dean → VPAA → HR/HRMO
function activeStep(role, macroStatus) {
    if (role === 'Technical'              && macroStatus === 'Pending')            return 'technical';
    if (role === 'Program-Chair'          && macroStatus === 'Tech-Approved')      return 'programChair';
    if (role === 'Practicum-Coordinator'  && macroStatus === 'Chair-Approved')     return 'practicumCoordinator';
    if (role === 'Dean'                   && macroStatus === 'Practicum-Approved') return 'dean';
    if (role === 'VPAA'                   && macroStatus === 'Dean-Approved')      return 'vpaa';
    if (role === 'HR'                     && macroStatus === 'VPAA-Noted')         return 'hr';
    if (role === 'HRMO'                   && macroStatus === 'VPAA-Noted')         return 'hr';
    // Admin/Super-Admin can act at whatever the current active step is
    if (['Admin', 'Super-Admin'].includes(role)) {
        if (macroStatus === 'Pending')            return 'technical';
        if (macroStatus === 'Tech-Approved')      return 'programChair';
        if (macroStatus === 'Chair-Approved')     return 'practicumCoordinator';
        if (macroStatus === 'Practicum-Approved') return 'dean';
        if (macroStatus === 'Dean-Approved')      return 'vpaa';
        if (macroStatus === 'VPAA-Noted')         return 'hr';
    }
    return null;
}

// --- Shared data-fetching helpers for admin pages ---------------------------

const ROLE_STATUS_FILTER = {
    'Technical':              ['Pending'],
    'Program-Chair':          ['Tech-Approved'],
    'Practicum-Coordinator':  ['Chair-Approved'],
    'Dean':                   ['Practicum-Approved'],
    'VPAA':                   ['Dean-Approved'],
    'HR':                     ['VPAA-Noted'],
    'HRMO':                   ['VPAA-Noted'],
    'Admin':                  ['Pending', 'Tech-Approved', 'Chair-Approved', 'Practicum-Approved', 'Dean-Approved', 'VPAA-Noted', 'Returned'],
    'Super-Admin':            ['Pending', 'Tech-Approved', 'Chair-Approved', 'Practicum-Approved', 'Dean-Approved', 'VPAA-Noted', 'Returned']
};

async function buildSubmissionList(role) {
    const allowedStatuses = ROLE_STATUS_FILTER[role] || [];
    const statusDocs = await Status_Main.find({
        status: { $in: allowedStatuses }
    }).sort({ updatedAt: -1 });

    const tlaIDs = statusDocs.map(s => s.tlaID);
    const tlas   = await TLA_Main.find({ _id: { $in: tlaIDs } });

    const userIDs = [...new Set(tlas.map(t => t.userID?.toString()))];
    const users   = await User.find({ _id: { $in: userIDs } }, 'firstName lastName email department');
    const userMap = {};
    for (const u of users) userMap[u._id.toString()] = u;

    const tlaMap = {};
    for (const t of tlas) tlaMap[t._id.toString()] = t;

    // Keep the same order as statusDocs (already sorted updatedAt desc)
    return statusDocs
        .map((sd) => {
            const t = tlaMap[sd.tlaID.toString()];
            if (!t) return null;
            const faculty = userMap[t.userID?.toString()];
            return {
                _id:         t._id,
                courseCode:  t.courseCode,
                section:     t.section,
                weekNumber:  t.weekNumber,
                dateofDigitalDay: t.dateofDigitalDay,
                facultyName: faculty ? `${faculty.firstName} ${faculty.lastName}` : '—',
                department:  faculty?.department || '—',
                macroStatus: sd?.status || '—',
                updatedAt:   sd?.updatedAt || t.updatedAt
            };
        })
        .filter(Boolean);
}

async function buildArchiveData() {
    const statusDocs = await Status_Main.find({
        status: { $in: ['VPAA-Noted', 'Archived'] }
    }).sort({ updatedAt: -1 });

    const tlaIDs = statusDocs.map(s => s.tlaID);
    const tlas   = await TLA_Main.find({ _id: { $in: tlaIDs } });

    const userIDs = [...new Set(tlas.map(t => t.userID?.toString()))];
    const users   = await User.find({ _id: { $in: userIDs } }, 'firstName lastName email department');
    const userMap = {};
    for (const u of users) userMap[u._id.toString()] = u;

    const toArchive = [];
    const archived  = [];
    const tlaMap = {};
    for (const t of tlas) tlaMap[t._id.toString()] = t;

    // Keep latest-first order from statusDocs
    for (const sd of statusDocs) {
        const t = tlaMap[sd.tlaID.toString()];
        if (!t) continue;
        const faculty = userMap[t.userID?.toString()];
        const entry   = {
            _id:         t._id,
            courseCode:  t.courseCode,
            section:     t.section,
            weekNumber:  t.weekNumber,
            facultyName: faculty ? `${faculty.firstName} ${faculty.lastName}` : '—',
            department:  faculty?.department || '—',
            deanApprovedAt:  sd?.dean?.approvalDate || null,
            vpaaNotedAt:     sd?.vpaa?.approvalDate || null,
            hrArchivedAt:    sd?.hr?.approvalDate   || null,
            macroStatus: sd?.status || '—'
        };
        if (sd?.status === 'Archived') archived.push(entry);
        else                           toArchive.push(entry);
    }
    return { toArchive, archived };
}

// ===============================================================================
//  COURSES PAGE (pulls from Syllabus database)
// ===============================================================================

export async function getCourses(req, res) {
    try {
        const user = req.session.user;

        if (APPROVAL_ROLES.includes(user?.role)) {
            return res.redirect('/admin/tla');
        }

        const userId = user?.id;

        // Only show courses assigned to the logged-in faculty (or created by them)
        const syllabi = await Syllabus.find({
            $or: [
                { assignedInstructor: userId },
                { userID: userId }
            ]
        });
        const syllabusIds = syllabi.map(s => s._id.toString());
        
        // Get approval status for each syllabus
        const approvals = await SyllabusApprovalStatus.find({ syllabusID: { $in: syllabusIds } });
        const statusMap = {};
        approvals.forEach(a => {
            statusMap[a.syllabusID.toString()] = a.status;
        });

        // Format courses with lock status and images
        const courses = syllabi.map(s => {
            const idStr = s._id.toString();
            const status = statusMap[idStr] || 'Not Submitted';
            // Lock if status is NOT Approved or Archived
            const isLocked = !['Approved', 'Archived'].includes(status);
            
            // Determine image: Base64 if exists, otherwise picsum fallback
            let courseImage;
            let hasRealImage = false;
            if (s.courseImage && s.courseImage.startsWith('data:')) {
                courseImage = s.courseImage;
                hasRealImage = true;
            } else {
                courseImage = `https://picsum.photos/seed/${s._id}/400/200`;
                hasRealImage = false;
            }
            
            return {
                syllabusId: idStr,
                courseCode: s.courseCode || 'N/A',
                courseTitle: s.courseTitle || 'Untitled Course',
                section: s.assignedInstructor ? `Section` : 'TBA',
                term: s.term || 'N/A',
                schoolYear: s.schoolYear || 'N/A',
                status,
                isLocked,
                courseImage,
                hasBanner: true,  // Always true since we have image (Base64 or fallback)
                hasRealImage      // True only if Base64 from Syllabus
            };
        });

        res.render('TLA/tlaCourses', {
            currentPageCategory: 'tla',
            user,
            courses
        });
    } catch (error) {
        console.error('getCourses error:', error);
        res.status(500).send('Server error');
    }
}

// ===============================================================================
//  DASHBOARD  (Faculty's own TLA weeks)
// ===============================================================================

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

// ===============================================================================
//  TLA FORM (GET new / GET existing)
// ===============================================================================

export async function getNewForm(req, res) {
    try {
        const userId = req.session.user.id;
        const syllabusId = req.query.syllabusId || '';
        const parsedWeek = Number(req.query.week);
        const prefillWeekNumber = Number.isInteger(parsedWeek) && parsedWeek >= 1 && parsedWeek <= 18
            ? parsedWeek
            : '';
        let prefillCourseCode = '';

        if (syllabusId) {
            const syllabus = await Syllabus.findById(syllabusId);
            if (syllabus) {
                const belongsToUser =
                    String(syllabus.assignedInstructor || '') === String(userId) ||
                    String(syllabus.userID || '') === String(userId);

                if (belongsToUser) {
                    prefillCourseCode = syllabus.courseCode || '';
                }
            }
        }

        res.render('TLA/tlaForm', {
            currentPageCategory: 'tla',
            user: req.session.user,
            tla: null,
            preDigital: null,
            postDigital: null,
            status: null,
            syllabusId,
            prefillCourseCode,
            prefillWeekNumber
        });
    } catch (error) {
        console.error('getNewForm error:', error);
        res.status(500).send('Server error');
    }
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

        let syllabusId = req.query.syllabusId || (tla.syllabusID ? tla.syllabusID.toString() : '');
        if (!syllabusId) {
            syllabusId = await resolveOwnedSyllabusId(req.session.user.id, '', tla.courseCode);
        }

        // Backfill legacy records once we resolve the owning syllabus.
        if (syllabusId && !tla.syllabusID) {
            await Promise.all([
                TLA_Main.findByIdAndUpdate(tla._id, { syllabusID: syllabusId }),
                TLA_B1.findByIdAndUpdate(tla._id, { syllabusID: syllabusId }),
                TLA_B2.findByIdAndUpdate(tla._id, { syllabusID: syllabusId })
            ]);
        }

        res.render('TLA/tlaForm', {
            currentPageCategory: 'tla',
            user: req.session.user,
            tla,
            preDigital:  preDigital  || null,
            postDigital: postDigital || null,
            status:      status      || null,
            syllabusId,
            prefillCourseCode: ''
        });
    } catch (error) {
        console.error('getFormById error:', error);
        res.status(500).send('Server error');
    }
}

// ===============================================================================
//  TLA FORM (POST create)
// ===============================================================================

export async function createTLA(req, res) {
    try {
        const {
            courseCode, section, dateofDigitalDay, facultyFacilitating,
            courseOutcomes, mediatingOutcomes, weekNumber,
            pre_moIloCode, pre_teacherLearningActivity, pre_lmsDigitalTool, pre_assessment,
            action, syllabusId
        } = req.body;

        const userID    = req.session.user.id;
        const resolvedSyllabusId = await resolveOwnedSyllabusId(userID, syllabusId, courseCode);
        const tlaStatus = action === 'submit' ? 'Pending' : 'Draft';

        const newTLA = await TLA_Main.create({
            courseCode, section, dateofDigitalDay, facultyFacilitating,
            courseOutcomes, mediatingOutcomes,
            weekNumber: weekNumber || null,
            syllabusID: resolvedSyllabusId || undefined,
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

        if (resolvedSyllabusId) {
            return res.redirect('/tla/overview/' + resolvedSyllabusId);
        }
        res.redirect('/tla/overview');
    } catch (error) {
        console.error('createTLA error:', error);
        res.status(500).send('Server error');
    }
}

// ===============================================================================
//  TLA FORM (POST update)
// ===============================================================================

export async function updateTLA(req, res) {
    try {
        const { id } = req.params;
        const {
            courseCode, section, dateofDigitalDay, facultyFacilitating,
            courseOutcomes, mediatingOutcomes, weekNumber,
            pre_moIloCode, pre_teacherLearningActivity, pre_lmsDigitalTool, pre_assessment,
            post_moIloCode, post_participantTurnout, post_assessmentResults, post_remarks,
            action, syllabusId
        } = req.body;

        const tla = await TLA_Main.findById(id);
        if (!tla) return res.status(404).send('TLA not found');

        if (tla.userID.toString() !== req.session.user.id) {
            return res.status(403).send('Forbidden');
        }

        if (tla.status === 'Archived') {
            return res.status(403).send('Cannot edit an Archived TLA');
        }

        const resolvedSyllabusId = await resolveOwnedSyllabusId(
            req.session.user.id,
            syllabusId || (tla.syllabusID ? tla.syllabusID.toString() : ''),
            courseCode || tla.courseCode
        );

        const isPostSubmit = action === 'submit-post';
        const isSubmit     = action === 'submit';
        const isDraft      = action === 'draft';
        const isApproved   = ['Approved', 'Dean-Approved', 'Chair-Approved', 'Tech-Approved', 'Practicum-Approved', 'VPAA-Noted', 'Returned'].includes(tla.status);
        const canSubmitPost = ['Dean-Approved', 'Approved'].includes(tla.status);

        if (isPostSubmit && !canSubmitPost) {
            return res.status(403).send('Post-digital submission is only allowed after Dean approval.');
        }

        let tlaStatus = tla.status;
        if (isDraft && !isApproved)  tlaStatus = 'Draft';
        if (isSubmit && !isApproved) tlaStatus = 'Pending';

        if (!isPostSubmit) {
            const tlaUpdate = {
                courseCode, section, dateofDigitalDay, facultyFacilitating,
                courseOutcomes, mediatingOutcomes,
                weekNumber: weekNumber || null,
                syllabusID: resolvedSyllabusId || tla.syllabusID || undefined,
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
                technical:            { status: 'Pending', approvedBy: '', approvalDate: null, remarks: '' },
                programChair:         { status: 'Pending', approvedBy: '', approvalDate: null, remarks: '' },
                practicumCoordinator: { status: 'Pending', approvedBy: '', approvalDate: null, remarks: '' },
                dean:                 { status: 'Pending', approvedBy: '', approvalDate: null, remarks: '' },
                vpaa:                 { status: 'Pending', approvedBy: '', approvalDate: null, remarks: '' },
                hr:                   { status: 'Pending', approvedBy: '', approvalDate: null, remarks: '' }
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

        if (resolvedSyllabusId && !tla.syllabusID) {
            await Promise.all([
                TLA_Main.findByIdAndUpdate(id, { syllabusID: resolvedSyllabusId }),
                TLA_B1.findByIdAndUpdate(id,   { syllabusID: resolvedSyllabusId }),
                TLA_B2.findByIdAndUpdate(id,   { syllabusID: resolvedSyllabusId })
            ]);
        }

        if (resolvedSyllabusId) {
            return res.redirect('/tla/overview/' + resolvedSyllabusId);
        }
        res.redirect('/tla/overview');
    } catch (error) {
        console.error('updateTLA error:', error);
        res.status(500).send('Server error');
    }
}

// ===============================================================================
//  OVERVIEW — Faculty's own weekly cards
// ===============================================================================

export async function getOverview(req, res) {
    try {
        const userID   = req.session.user.id;
        const userRole = req.session.user.role;

        if (APPROVAL_ROLES.includes(userRole)) {
            return res.redirect('/admin/tla');
        }

        const sid = req.params.syllabusId;
        let courseInfo = {
            syllabusId: null,
            courseCode: 'N/A',
            courseTitle: 'Untitled Course',
            section: 'TBA',
            schoolYear: 'N/A',
            term: 'N/A',
            courseImage: null,
            status: 'Not Submitted',
            isLocked: true
        };

        // If syllabusId provided, fetch from database
        if (sid) {
            const syllabus = await Syllabus.findById(sid);
            if (syllabus) {
                const belongsToUser =
                    String(syllabus.assignedInstructor || '') === String(userID) ||
                    String(syllabus.userID || '') === String(userID);

                if (!belongsToUser) {
                    return res.status(403).send('Forbidden - you are not assigned to this course.');
                }

                const approval = await SyllabusApprovalStatus.findOne({ syllabusID: sid });
                const status = approval?.status || 'Not Submitted';
                const isLocked = !['Approved', 'Archived'].includes(status);

                courseInfo = {
                    syllabusId: sid,
                    courseCode: syllabus.courseCode || 'N/A',
                    courseTitle: syllabus.courseTitle || 'Untitled Course',
                    section: 'Section',
                    schoolYear: syllabus.schoolYear || 'N/A',
                    term: syllabus.term || 'N/A',
                    courseImage: (syllabus.courseImage && syllabus.courseImage.startsWith('data:'))
                        ? syllabus.courseImage
                        : `https://picsum.photos/seed/${sid}/400/200`,
                    status,
                    isLocked
                };
            }
        }

        const tlaQuery = { userID };
        if (courseInfo.syllabusId) {
            tlaQuery.$or = [
                { syllabusID: courseInfo.syllabusId },
                { courseCode: courseInfo.courseCode }
            ];
        }

        const tlas = await TLA_Main.find(tlaQuery).sort({ weekNumber: 1 });
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

        res.render('TLA/tlaOverview', {
            currentPageCategory: 'tla',
            user: req.session.user,
            weeks,
            courseInfo,
            isApprover,
            role: userRole
        });
    } catch (error) {
        console.error('getOverview error:', error);
        res.status(500).send('Server error');
    }
}

// ===============================================================================
//  (getAdminOverview and getHRDashboard removed — consolidated into getAdminTLA)
// ===============================================================================

// ===============================================================================
//  APPROVAL PAGE  (GET)
//  GET /tla/approval/:id
// ===============================================================================

export async function getApprovalPage(req, res) {
    try {
        const tlaID   = req.params.id;
        const role    = req.session.user.role;

        // -- No ID -> static placeholder preview ---------------------------
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
                facultyName:      '—',
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

        // -- Pull this role's current step data for prefilling -------------
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
            facultyName:      tla.facultyFacilitating || '—',
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

// ===============================================================================
//  APPROVAL ACTION  (POST)
//  POST /tla/approval/:id
//  Body: { comment, verdict ("Approved"|"Returned"), action ("submit"|"draft") }
// ===============================================================================

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

        // -- Draft save: just store the comment without advancing the chain --
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

        // -- Actual verdict submission -------------------------------------
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
                // Approved — advance the chain
                const advanceMap = {
                    technical:            'Tech-Approved',
                    programChair:         'Chair-Approved',
                    practicumCoordinator: 'Practicum-Approved',
                    dean:                 'Dean-Approved',
                    vpaa:                 'VPAA-Noted',
                    hr:                   'Archived'
                };
                nextMacro = advanceMap[step] || macroNow;

                if (step === 'hr') {
                    nextTlaStatus = 'Archived';
                } else if (step === 'vpaa') {
                    nextTlaStatus = 'VPAA-Noted';
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

        // -- Fallback: no matching action ----------------------------------
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

// ===============================================================================
//  HR ARCHIVE ACTION  (POST)
//  POST /tla/hr/archive/:id  — HR archives a Dean-Approved TLA
// ===============================================================================

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

        res.redirect('/admin/tla');
    } catch (error) {
        console.error('postHRArchive error:', error);
        res.status(500).send('Server error');
    }
}

// ===============================================================================
//  PDF GENERATION
//  POST /tla/form/generate-docx
// ===============================================================================

function buildTlaPayload(body, user) {
    const b = body || {};
    return {
        courseCode: b.courseCode || '',
        section: b.section || '',
        dateofDigitalDay: b.dateofDigitalDay || '',
        facultyFacilitating:
            b.facultyFacilitating ||
            (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : ''),
        courseOutcomes: b.courseOutcomes || '',
        mediatingOutcomes: b.mediatingOutcomes || '',
        pre_moIloCode: b.pre_moIloCode || '',
        pre_teacherLearningActivity: b.pre_teacherLearningActivity || '',
        pre_lmsDigitalTool: b.pre_lmsDigitalTool || '',
        pre_assessment: b.pre_assessment || '',
        post_moIloCode: b.post_moIloCode || '',
        post_participantTurnout: b.post_participantTurnout || '',
        post_assessmentResults: b.post_assessmentResults || '',
        post_remarks: b.post_remarks || ''
    };
}

async function renderTlaPdf(payload) {
    const templateBytes = readFileSync(PDF_TEMPLATE);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const page = pdfDoc.getPages()[0];
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const black = rgb(0, 0, 0);

    const draw = (txt, x, y, { size = 9, f = font, color = black, maxWidth } = {}) => {
        if (!txt) return;
        let text = String(txt);
        if (maxWidth) {
            while (f.widthOfTextAtSize(text, size) > maxWidth && text.length > 1) {
                text = text.slice(0, -1);
            }
        }
        page.drawText(text, { x, y, size, font: f, color });
    };

    const drawWrapped = (txt, x, y, cellW, { size = 8, lineH = 10, f = font } = {}) => {
        if (!txt) return;
        const words = String(txt).split(/\s+/);
        let line = '';
        let curY = y;
        for (const word of words) {
            const test = line ? line + ' ' + word : word;
            if (f.widthOfTextAtSize(test, size) > cellW - 6) {
                if (line) {
                    page.drawText(line, { x, y: curY, size, font: f, color: black });
                    curY -= lineH;
                }
                line = word;
            } else {
                line = test;
            }
        }
        if (line) page.drawText(line, { x, y: curY, size, font: f, color: black });
    };

    draw(payload.courseCode, 113, 737, { size: 9, maxWidth: 105 });
    draw(payload.section, 290, 737, { size: 9, maxWidth: 110 });
    draw(payload.dateofDigitalDay, 410, 732, { size: 9, maxWidth: 145 });
    draw(payload.facultyFacilitating, 250, 718, { size: 9, maxWidth: 305 });
    drawWrapped(payload.courseOutcomes, 148, 705, 407, { size: 8, lineH: 9 });
    drawWrapped(payload.mediatingOutcomes, 56, 671, 498, { size: 8, lineH: 9 });

    const preY = 585;
    drawWrapped(payload.pre_moIloCode, 55, preY, 65, { size: 8 });
    drawWrapped(payload.pre_teacherLearningActivity, 128, preY, 195, { size: 8 });
    drawWrapped(payload.pre_lmsDigitalTool, 331, preY, 103, { size: 8 });
    drawWrapped(payload.pre_assessment, 441, preY, 113, { size: 8 });

    const postY = 305;
    drawWrapped(payload.post_moIloCode, 55, postY, 65, { size: 8 });
    drawWrapped(payload.post_participantTurnout, 128, postY, 195, { size: 8 });
    drawWrapped(payload.post_assessmentResults, 331, postY, 103, { size: 8 });
    drawWrapped(payload.post_remarks, 441, postY, 113, { size: 8 });

    return pdfDoc.save();
}

export async function generateDocx(req, res) {
    try {
        const payload = buildTlaPayload(req.body, req.session.user);
        const pdfBytes = await renderTlaPdf(payload);
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

// ===============================================================================
//  PDF PREVIEW FROM CURRENT FORM INPUTS (ATA-like preview endpoint)
//  POST /tla/form/preview-pdf
// ===============================================================================

export async function previewTlaPdf(req, res) {
    try {
        const payload = buildTlaPayload(req.body, req.session.user);
        const pdfBytes = await renderTlaPdf(payload);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline; filename="TLA_Preview.pdf"'
        });
        res.send(Buffer.from(pdfBytes));
    } catch (err) {
        console.error('previewTlaPdf error:', err);
        res.status(500).send('Failed to preview PDF');
    }
}

// ===============================================================================
//  VIEW SAVED TLA AS PDF (ATA-like view-by-id endpoint)
//  GET /tla/form/pdf/:id
// ===============================================================================

export async function viewTlaPdf(req, res) {
    try {
        const tla = await TLA_Main.findById(req.params.id);
        if (!tla) return res.status(404).send('TLA not found');

        if (tla.userID.toString() !== req.session.user.id) {
            return res.status(403).send('Forbidden');
        }

        const [preDigital, postDigital] = await Promise.all([
            Pre_Main.findOne({ tlaID: tla._id }),
            Post_Main.findOne({ tlaID: tla._id })
        ]);

        const payload = buildTlaPayload({
            courseCode: tla.courseCode,
            section: tla.section,
            dateofDigitalDay: tla.dateofDigitalDay,
            facultyFacilitating: tla.facultyFacilitating,
            courseOutcomes: tla.courseOutcomes,
            mediatingOutcomes: tla.mediatingOutcomes,
            pre_moIloCode: preDigital?.moIloCode,
            pre_teacherLearningActivity: preDigital?.teacherLearningActivity,
            pre_lmsDigitalTool: preDigital?.lmsDigitalTool,
            pre_assessment: preDigital?.assessment,
            post_moIloCode: postDigital?.moIloCode,
            post_participantTurnout: postDigital?.participantTurnout,
            post_assessmentResults: postDigital?.assessmentResults,
            post_remarks: postDigital?.remarks
        }, req.session.user);

        const pdfBytes = await renderTlaPdf(payload);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline; filename="TLA_Report.pdf"'
        });
        res.send(Buffer.from(pdfBytes));
    } catch (err) {
        console.error('viewTlaPdf error:', err);
        res.status(500).send('Failed to view PDF');
    }
}

// ===============================================================================
//  TLA PDF X-RAY (visualize field names from fillable template)
//  GET /tla/form/pdf-xray
// ===============================================================================

export async function discoverTlaPdfFields(req, res) {
    try {
        const existingPdfBytes = readFileSync(PDF_TEMPLATE);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const pdfForm = pdfDoc.getForm();
        const fields = pdfForm.getFields();

        fields.forEach((field) => {
            const type = field.constructor.name;
            const name = field.getName();

            try {
                if (type === 'PDFTextField') {
                    const textField = pdfForm.getTextField(name);
                    textField.setText(name);
                    textField.setFontSize(7);
                } else if (type === 'PDFDropdown') {
                    const dropField = pdfForm.getDropdown(name);
                    dropField.addOptions([name]);
                    dropField.select(name);
                } else if (type === 'PDFCheckBox') {
                    pdfForm.getCheckBox(name).check();
                }
            } catch (err) {
                // Skip unsupported or malformed fields without failing the whole preview.
            }
        });

        pdfForm.flatten();
        const pdfBytes = await pdfDoc.save();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename=TLA_Visual_PDF_Map.pdf');
        res.send(Buffer.from(pdfBytes));
    } catch (error) {
        console.error('discoverTlaPdfFields error:', error);
        res.status(500).send('Failed to generate TLA visual PDF map.');
    }
}

// ===============================================================================
//  ADMIN CONSOLIDATED TLA PAGE
//  GET /admin/tla — review queue + HR archive in one page, with admin sidebar
// ===============================================================================

export async function getAdminTLA(req, res) {
    try {
        const role = req.session.user.role;
        const isAdmin = role === 'Admin' || role === 'Super-Admin';

        const [submissions, archiveData] = await Promise.all([
            buildSubmissionList(role),
            isAdmin ? buildArchiveData() : Promise.resolve({ toArchive: [], archived: [] })
        ]);

        res.render('TLA/tlaAdminConsolidated', {
            currentPageCategory: 'tla',
            user: req.session.user,
            submissions,
            toArchive: archiveData.toArchive,
            archived:  archiveData.archived,
            role
        });
    } catch (error) {
        console.error('getAdminTLA error:', error);
        res.status(500).send('Server error');
    }
}
