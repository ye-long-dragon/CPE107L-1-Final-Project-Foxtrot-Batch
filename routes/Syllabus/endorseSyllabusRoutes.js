import express from 'express';
import { mainDB } from '../../database/mongo-dbconnect.js';
import Syllabus from '../../models/Syllabus/syllabus.js';
import SyllabusApprovalStatus from '../../models/Syllabus/syllabusApprovalStatus.js';
import ProgramEducationObjectives from '../../models/Syllabus/programEducationObjectives.js';
import StudentEducationObjectives from '../../models/Syllabus/studentEducationalObjectives.js';
import CourseOutcomes from '../../models/Syllabus/courseOutcomes.js';
import CourseMapping from '../../models/Syllabus/courseMapping.js';
import WeeklySchedule from '../../models/Syllabus/weeklySchedule.js';
import CourseEvaluationPerCO from '../../models/Syllabus/courseEvaluationPerCO.js';

const endorseSyllabusRouter = express.Router();

/* -----------------------------------------------------------------------
   DUMMY DATA — used as fallback when DB has no records
   ----------------------------------------------------------------------- */
const DUMMY_COURSES = [
    {
        id: 'pc-demo-001',
        code: 'CPE107L-1',
        title: 'Software Design',
        instructor: 'Juan dela Cruz',
        img: 'https://picsum.photos/seed/cpe107/400/200',
        hasDraft: false,
        status: 'No Syllabus Draft'
    },
    {
        id: 'pc-demo-002',
        code: 'EE101-2',
        title: 'Fundamental of Electrical Circuits',
        instructor: 'Maria Santos',
        img: 'https://picsum.photos/seed/ee101/400/200',
        hasDraft: true,
        status: 'Pending'
    }
];

const DUMMY_DRAFTS = [
    {
        syllabusId: 'endorse-demo-001',
        courseCode: 'CPE101-4',
        courseTitle: 'Software Design',
        instructor: 'Juan dela Cruz',
        img: 'https://picsum.photos/seed/cpe101/400/200',
        status: 'PendingApproval', // Explicit for Approval Queue Pending
        endorsedDate: null,
        endorsedBy: null,
        remarks: 'Waiting for Program Chair review.',
        submittedDate: 'Feb 25, 2026'
    },
    {
        syllabusId: 'endorse-demo-002',
        courseCode: 'EE101-2',
        courseTitle: 'Fundamental of Electrical Circuits',
        instructor: 'Maria Santos',
        img: 'https://picsum.photos/seed/ee101/400/200',
        status: 'Endorsed',
        endorsedDate: 'Feb 28, 2026',
        endorsedBy: 'Prof. Dela Vega',
        remarks: 'Endorsed with minor formatting notes.',
        submittedDate: 'Feb 22, 2026'
    },
    {
        syllabusId: 'endorse-demo-003',
        courseCode: 'CPE101L-4',
        courseTitle: 'Digital Electronics: Logic Circuits and Design',
        instructor: 'Jose Reyes',
        img: 'https://picsum.photos/seed/cpe101l/400/200',
        status: 'PendingEndorsement', // Explicit for Endorsement Queue Pending
        endorsedDate: 'Mar 15, 2026',
        endorsedBy: 'PC_Approved',
        remarks: 'Awaiting final endorsement to Dean.',
        submittedDate: 'Feb 26, 2026'
    },
    {
        syllabusId: 'endorse-demo-004',
        courseCode: 'CPE107L-1',
        courseTitle: 'Software Design II',
        instructor: 'Juan dela Cruz',
        img: 'https://picsum.photos/seed/cpe107/400/200',
        status: 'PC_Approved', // Already approved in Approval Queue
        endorsedDate: 'Mar 10, 2026',
        endorsedBy: 'PC_Approved',
        remarks: 'Ready for endorsement.',
        submittedDate: 'Mar 01, 2026'
    }
];

/* -----------------------------------------------------------------------
   GET /syllabus/prog-chair  →  Course Overview (Program Chair)
   ----------------------------------------------------------------------- */
endorseSyllabusRouter.get('/', async (req, res) => {
    try {
        let userCourses = await Syllabus.find({});

        if (mainDB.models.User) {
            await Syllabus.populate(userCourses, { path: 'assignedInstructor' });
        }

        const courseIds = userCourses.map(c => c._id.toString());
        const approvals = await SyllabusApprovalStatus.find({ syllabusID: { $in: courseIds } });

        const formattedCourses = userCourses.map(c => {
            const idStr = c._id.toString();
            const draftRecord = approvals.find(a => a.syllabusID.toString() === idStr);
            return {
                id: idStr,
                code: c.courseCode,
                title: c.courseTitle,
                instructor: c.assignedInstructor
                    ? `${c.assignedInstructor.firstName} ${c.assignedInstructor.lastName}`
                    : 'TBA',
                img: (c.courseImage && c.courseImage.startsWith('data:'))
                    ? c.courseImage
                    : `https://picsum.photos/seed/${c._id}/400/200`,
                hasDraft: !!draftRecord,
                status: draftRecord ? draftRecord.status : 'No Syllabus Draft'
            };
        });

        let courses = formattedCourses.length > 0 ? formattedCourses : DUMMY_COURSES;

        // Always show at least dummy data so the page isn't blank
        if (courses.length === 0) courses = DUMMY_COURSES;

        res.render('Syllabus/courseOverviewProgChair', {
            courses,
            currentPageCategory: 'syllabus',
            userId: 'prog-chair-demo'
        });
    } catch (error) {
        console.error('PC Course Overview error:', error);
        res.render('Syllabus/courseOverviewProgChair', {
            courses: DUMMY_COURSES,
            currentPageCategory: 'syllabus',
            userId: 'prog-chair-demo'
        });
    }
});

/* -----------------------------------------------------------------------
   GET /syllabus/prog-chair/approve  →  Approval Queue
   ----------------------------------------------------------------------- */
endorseSyllabusRouter.get('/approve', async (req, res) => {
    try {
        const approvals = await SyllabusApprovalStatus.find({
            $or: [
                { status: 'Pending' },
                { status: 'Approved', approvedBy: 'PC_Approved' },
                { status: 'Approved', approvedBy: 'Program Chair' },
                { approvedBy: 'Rejected' }
            ]
        });
        let drafts = [];

        if (approvals.length > 0) {
            const syllabusIds = approvals.map(a => a.syllabusID);
            let syllabuses = await Syllabus.find({ _id: { $in: syllabusIds } });

            if (mainDB.models.User) {
                await Syllabus.populate(syllabuses, { path: 'assignedInstructor' });
            }

            drafts = approvals.map(approval => {
                const syl = syllabuses.find(s => s._id.toString() === approval.syllabusID.toString());
                if (!syl) return null;
                
                // Map status for frontend filter (Pending, PC_Approved, or Rejected)
                let displayStatus = 'Pending';
                let statusDateLabel = 'Submitted';

                if (approval.approvedBy === 'Rejected') {
                    displayStatus = 'Rejected';
                    statusDateLabel = 'Rejected';
                } else if (approval.approvedBy === 'PC_Approved' || approval.approvedBy === 'Program Chair') {
                    displayStatus = 'PC_Approved';
                    statusDateLabel = 'Endorsed';
                }

                return {
                    syllabusId: syl._id.toString(),
                    courseCode: syl.courseCode || 'N/A',
                    courseTitle: syl.courseTitle || 'Untitled',
                    instructor: syl.assignedInstructor
                        ? `${syl.assignedInstructor.firstName} ${syl.assignedInstructor.lastName}`
                        : 'TBA',
                    img: (syl.courseImage && syl.courseImage.startsWith('data:'))
                        ? syl.courseImage
                        : `https://picsum.photos/seed/${syl._id}/400/200`,
                    status: displayStatus,
                    statusDateLabel: statusDateLabel,
                    endorsedDate: approval.approvalDate
                        ? new Date(approval.approvalDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                        : null,
                    submittedDate: approval.updatedAt
                        ? new Date(approval.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                        : 'N/A'
                };
            }).filter(Boolean);
        }

        let dummyDrafts = DUMMY_DRAFTS.filter(d => 
            d.status === 'PendingApproval' || 
            d.status === 'PC_Approved' || 
            d.status === 'Endorsed' || 
            d.status === 'PendingEndorsement' ||
            d.status === 'Rejected'
        );
        // Normalize status for dummy data in this view
        dummyDrafts = dummyDrafts.map(d => {
            let normStatus = 'Pending';
            let normLabel = 'Submitted';
            if (d.status === 'Rejected') {
                normStatus = 'Rejected';
                normLabel = 'Rejected';
            } else if (d.status === 'PC_Approved' || d.status === 'Endorsed') {
                normStatus = 'PC_Approved';
                normLabel = 'Approved';
            }
            return { ...d, status: normStatus, statusDateLabel: normLabel };
        });

        drafts = [...drafts, ...dummyDrafts];

        const pendingCount = drafts.filter(d => d.status === 'Pending').length;
        const approvedHistoryCount = drafts.filter(d => d.status === 'PC_Approved').length;
        const rejectedCount = drafts.filter(d => d.status === 'Rejected').length;

        const statusOrder = { 'Pending': 1, 'PC_Approved': 2, 'Endorsed': 2, 'Rejected': 3 };
        drafts.sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));

        res.render('Syllabus/syllabusEndorsementQueue', {
            drafts,
            pendingCount,
            endorsedCount: approvedHistoryCount,
            rejectedCount: rejectedCount,
            currentPageCategory: 'syllabus',
            actionUrlPrefix: '/syllabus/prog-chair/approve',
            actionLabel: 'Review',
            approvedLabel: 'Endorsed',
            approvedFilter: 'PC_Approved',
            rejectedFilter: 'Rejected',
            rejectedLabel: 'Rejected',
            queueTitle: 'Syllabus Endorsement Queue',
            queueSubtitle: 'Review and endorse syllabuses submitted by faculty to the Dean.'
        });
    } catch (error) {
        console.error('Approval Queue error:', error);
        res.render('Syllabus/syllabusEndorsementQueue', {
            drafts: [], pendingCount: 0, endorsedCount: 0, currentPageCategory: 'syllabus',
            actionUrlPrefix: '/syllabus/prog-chair/approve', actionLabel: 'Review',
            queueTitle: 'Program Chair Approval Queue', queueSubtitle: ''
        });
    }
});

/* -----------------------------------------------------------------------
   GET /syllabus/prog-chair/approve/:syllabusId  →  Approval Detail
   ----------------------------------------------------------------------- */
endorseSyllabusRouter.get('/approve/:syllabusId', async (req, res) => {
    const { syllabusId } = req.params;
    try {
        // Handle Dummy Data ID
        if (syllabusId.startsWith('endorse-demo-') || syllabusId.startsWith('pc-demo-')) {
            const dummy = DUMMY_DRAFTS.find(d => d.syllabusId === syllabusId);
            if (dummy) {
                return res.render('Syllabus/syllabusProgChairEndorsement', {
                    courseName: dummy.courseTitle,
                    courseCode: dummy.courseCode,
                    courseSection: 'N/A',
                    academicYear: '2025-2026',
                    fileType: 'Syllabus Draft (DEMO)',
                    syllabusId: syllabusId,
                    currentStatus: 'Pending',
                    approvalState: dummy.status === 'PC_Approved' ? 'PC_Approved' : null,
                    existingComment: dummy.remarks || '',
                    currentPageCategory: 'syllabus',
                    actionUrlPrefix: '/syllabus/prog-chair/approve',
                    optionApproveValue: 'PC_Approved',
                    actionTitle: 'Syllabus Endorsement',
                    workflowStep: 'endorsement',
                    actionLabel: 'Endorse Syllabus'
                });
            }
        }

        const syl = await Syllabus.findById(syllabusId).populate('assignedInstructor');
        const approval = await SyllabusApprovalStatus.findOne({ syllabusID: syllabusId });

        if (syl) {
            const peos = await ProgramEducationObjectives.find({ syllabusID: syllabusId });
            const seos = await StudentEducationObjectives.find({ syllabusID: syllabusId });
            const cos = await CourseOutcomes.find({ syllabusID: syllabusId });
            const mappings = await CourseMapping.find({ syllabusID: syllabusId });
            const schedules = await WeeklySchedule.find({ syllabusID: syllabusId }).sort({ week: 1 });
            const evaluations = await CourseEvaluationPerCO.find({ syllabusID: syllabusId });

            return res.render('Syllabus/syllabusProgChairEndorsement', {
                syl,
                peos,
                seos,
                cos,
                mappings,
                schedules,
                evaluations,
                courseName: syl.courseTitle || 'Course Name',
                courseCode: syl.courseCode || 'Course Code',
                courseSection: syl.section || 'Section',
                academicYear: syl.academicYear || 'Academic Year',
                fileType: 'Syllabus Draft',
                syllabusId: syllabusId, // Consistent naming
                currentStatus: approval ? approval.status : 'Pending',
                approvalState: approval ? approval.approvedBy : null,
                existingComment: approval ? (approval.remarks || '') : '',
                currentPageCategory: 'syllabus',
                actionUrlPrefix: '/syllabus/prog-chair/approve',
                optionApproveValue: 'PC_Approved', // Value submitted when approved
                actionTitle: 'Syllabus Endorsement',
                workflowStep: 'endorsement',
                actionLabel: 'Endorse Syllabus'
            });
        }
    } catch (err) { console.error('Approval detail error:', err); }
    res.redirect('/syllabus/prog-chair/approve');
});

/* -----------------------------------------------------------------------
   POST /syllabus/prog-chair/approve/:syllabusId  →  Save Draft or Submit Decision
   ----------------------------------------------------------------------- */
endorseSyllabusRouter.post('/approve/:syllabusId', async (req, res) => {
    const { syllabusId } = req.params;
    const { comment, status, action } = req.body;

    try {
        // Handle dummy approval (no DB record exists)
        if (syllabusId.startsWith('endorse-demo-') || syllabusId.startsWith('pc-demo-')) {
            const dummy = DUMMY_DRAFTS.find(d => d.syllabusId === syllabusId);
            if (dummy) {
                dummy.remarks = comment || '';
                if (action !== 'draft') {
                    if (status === 'Reject' || status === 'Returned') {
                        dummy.status = 'Rejected';
                        dummy.endorsedBy = 'Rejected';
                    } else if (status === 'PC_Approved' || status === 'Approved') {
                        dummy.status = 'Approved';
                        dummy.endorsedBy = 'Program Chair';
                        dummy.endorsedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                    } else if (status === 'Reject' || status === 'Rejected') {
                        dummy.status = 'Rejected';
                        dummy.endorsedBy = 'Rejected';
                    }
                }
            }
            return res.json({ success: true, message: `Demo syllabus decision saved.` });
        }

        let approval = await SyllabusApprovalStatus.findOne({ syllabusID: syllabusId });
        if (!approval) return res.status(404).json({ success: false, message: 'Approval record not found.' });

        approval.remarks = comment || '';

        if (action === 'draft') {
            await approval.save();
            return res.json({ success: true, message: 'Draft remarks saved successfully.' });
        }

        if (status === 'Reject' || status === 'Returned') {
            approval.approvedBy = 'Rejected';
            // Keeping status Pending as requested, just marking the approvedBy to Rejected
        } else if (status === 'PC_Approved' || status === 'Approve Syllabus') {
            approval.status = 'Approved'; 
            approval.approvedBy = 'Program Chair';
            approval.approvalDate = new Date();
        } else if (status === 'Reject' || status === 'Reject Syllabus' || status === 'Rejected') {
            approval.status = 'Pending';
            approval.approvedBy = 'Rejected';
        }

        await approval.save();
        res.json({ success: true, message: `Syllabus decision saved.` });
    } catch (err) {
        console.error('PC Approval action error:', err);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

/* -----------------------------------------------------------------------
   GET /syllabus/prog-chair/endorse  →  Endorsement Queue
   ----------------------------------------------------------------------- */
endorseSyllabusRouter.get('/endorse', async (req, res) => {
    try {
        // Fetch PC Approved (Pending Endorsement) and Program Chair Endorsed
        const approvals = await SyllabusApprovalStatus.find({
            $or: [
                { status: 'Approved', approvedBy: 'PC_Approved' }, // Now in DB as Approved
                { status: 'Approved', approvedBy: 'Program Chair' }
            ]
        });
        let drafts = [];

        if (approvals.length > 0) {
            const syllabusIds = approvals.map(a => a.syllabusID);
            let syllabuses = await Syllabus.find({ _id: { $in: syllabusIds } });

            if (mainDB.models.User) {
                await Syllabus.populate(syllabuses, { path: 'assignedInstructor' });
            }

            drafts = approvals.map(approval => {
                const syl = syllabuses.find(s => s._id.toString() === approval.syllabusID.toString());
                if (!syl) return null;

                // Map status for frontend filter (Pending or Endorsed)
                const isEndorsed = approval.approvedBy === 'Program Chair';
                const displayStatus = isEndorsed ? 'Endorsed' : 'Pending';

                return {
                    syllabusId: syl._id.toString(),
                    courseCode: syl.courseCode || 'N/A',
                    courseTitle: syl.courseTitle || 'Untitled',
                    instructor: syl.assignedInstructor
                        ? `${syl.assignedInstructor.firstName} ${syl.assignedInstructor.lastName}`
                        : 'TBA',
                    img: (syl.courseImage && syl.courseImage.startsWith('data:'))
                        ? syl.courseImage
                        : `https://picsum.photos/seed/${syl._id}/400/200`,
                    status: displayStatus,
                    statusDateLabel: isEndorsed ? 'Endorsed' : 'Approved',
                    endorsedDate: approval.approvalDate
                        ? new Date(approval.approvalDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                        : null,
                    endorsedBy: approval.approvedBy || null,
                    remarks: approval.remarks || '',
                    submittedDate: approval.updatedAt
                        ? new Date(approval.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                        : 'N/A'
                };
            }).filter(Boolean);
        }

        let dummyDrafts = DUMMY_DRAFTS.filter(d => d.status === 'PendingEndorsement' || d.status === 'Endorsed' || d.status === 'PC_Approved');
        // Normalize status for dummy data in this view
        dummyDrafts = dummyDrafts.map(d => ({ ...d, status: (d.status === 'PendingEndorsement' || d.status === 'PC_Approved') ? 'Pending' : 'Endorsed' }));

        drafts = [...drafts, ...dummyDrafts];

        const pendingCount = drafts.filter(d => d.status === 'Pending').length;
        const endorsedHistoryCount = drafts.filter(d => d.status === 'Endorsed').length;

        const statusOrder = { 'Pending': 1, 'Endorsed': 2, 'PC_Approved': 2, 'Rejected': 3 };
        drafts.sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));

        res.render('Syllabus/syllabusEndorsementQueue', {
            drafts,
            pendingCount,
            endorsedCount: endorsedHistoryCount,
            currentPageCategory: 'syllabus',
            actionUrlPrefix: '/syllabus/prog-chair/endorse',
            actionLabel: 'Endorse',
            approvedLabel: 'Endorsed',
            approvedFilter: 'Endorsed',
            queueTitle: 'Program Chair Endorsement Queue',
            queueSubtitle: 'Finalize and endorse approved syllabuses to the Dean.'
        });
    } catch (error) {
        console.error('Endorsement Queue error:', error);
        res.render('Syllabus/syllabusEndorsementQueue', {
            drafts: [], pendingCount: 0, endorsedCount: 0, currentPageCategory: 'syllabus',
            actionUrlPrefix: '/syllabus/prog-chair/endorse', actionLabel: 'Endorse', queueTitle: 'Program Chair Endorsement Queue', queueSubtitle: ''
        });
    }
});

/* -----------------------------------------------------------------------
   GET /syllabus/prog-chair/endorse/:syllabusId  →  Endorsement Detail
   ----------------------------------------------------------------------- */
endorseSyllabusRouter.get('/endorse/:syllabusId', async (req, res) => {
    const { syllabusId } = req.params;
    try {
        // Handle Dummy Data ID
        if (syllabusId.startsWith('endorse-demo-') || syllabusId.startsWith('pc-demo-')) {
            const dummy = DUMMY_DRAFTS.find(d => d.syllabusId === syllabusId);
            if (dummy) {
                return res.render('Syllabus/syllabusProgChairEndorsement', {
                    courseName: dummy.courseTitle,
                    courseCode: dummy.courseCode,
                    courseSection: 'N/A',
                    academicYear: '2025-2026',
                    fileType: 'Syllabus Draft (DEMO)',
                    syllabusId,
                    currentStatus: dummy.status === 'Endorsed' ? 'Approved' : 'Pending',
                    approvalState: dummy.status === 'Endorsed' ? 'Program Chair' : 'PC_Approved',
                    existingComment: dummy.remarks || '',
                    currentPageCategory: 'syllabus',
                    actionUrlPrefix: '/syllabus/prog-chair/endorse',
                    optionApproveValue: 'Approved',
                    actionTitle: 'Program Chair Endorsement',
                    workflowStep: 'endorsement'
                });
            }
        }

        const syl = await Syllabus.findById(syllabusId).populate('assignedInstructor');
        const approval = await SyllabusApprovalStatus.findOne({ syllabusID: syllabusId });

        if (syl) {
            const peos = await ProgramEducationObjectives.find({ syllabusID: syllabusId });
            const seos = await StudentEducationObjectives.find({ syllabusID: syllabusId });
            const cos = await CourseOutcomes.find({ syllabusID: syllabusId });
            const mappings = await CourseMapping.find({ syllabusID: syllabusId });
            const schedules = await WeeklySchedule.find({ syllabusID: syllabusId }).sort({ week: 1 });
            const evaluations = await CourseEvaluationPerCO.find({ syllabusID: syllabusId });

            return res.render('Syllabus/syllabusProgChairEndorsement', {
                syl,
                peos,
                seos,
                cos,
                mappings,
                schedules,
                evaluations,
                courseName: syl.courseTitle || 'Course Name',
                courseCode: syl.courseCode || 'Course Code',
                courseSection: syl.section || 'Section',
                academicYear: syl.academicYear || 'Academic Year',
                fileType: 'Syllabus Draft',
                syllabusId: syllabusId, // Consistent naming
                currentStatus: approval ? approval.status : 'Pending',
                approvalState: approval ? approval.approvedBy : null,
                existingComment: approval ? (approval.remarks || '') : '',
                currentPageCategory: 'syllabus',
                actionUrlPrefix: '/syllabus/prog-chair/endorse',
                optionApproveValue: 'Approved', // Value submitted when endorsed
                actionTitle: 'Program Chair Endorsement',
                workflowStep: 'endorsement'
            });
        }
    } catch (err) { console.error('Endorsement detail error:', err); }
    res.redirect('/syllabus/prog-chair/endorse');
});

/* -----------------------------------------------------------------------
   POST /syllabus/prog-chair/endorse/:syllabusId  →  Save Draft or Submit Endorsement
   ----------------------------------------------------------------------- */
endorseSyllabusRouter.post('/endorse/:syllabusId', async (req, res) => {
    const { syllabusId } = req.params;
    const { comment, status, action } = req.body;

    try {
        // Handle dummy endorsement
        if (syllabusId.startsWith('endorse-demo-') || syllabusId.startsWith('pc-demo-')) {
            const dummy = DUMMY_DRAFTS.find(d => d.syllabusId === syllabusId);
            if (dummy) {
                dummy.remarks = comment || '';
                if (action !== 'draft') {
                    if (status === 'Approved') {
                        dummy.status = 'Endorsed';
                        dummy.endorsedBy = 'Program Chair';
                        dummy.endorsedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                    }
                }
            }
            return res.json({ success: true, message: `Demo endorsement submitted.` });
        }

        let approval = await SyllabusApprovalStatus.findOne({ syllabusID: syllabusId });
        if (!approval) return res.status(404).json({ success: false, message: 'Approval record not found.' });

        if (approval.approvedBy !== 'PC_Approved' && approval.status !== 'Approved') {
            return res.status(400).json({ success: false, message: 'Syllabus must be Approved in the Approval Queue first.' });
        }

        approval.remarks = comment || '';

        if (action === 'draft') {
            await approval.save();
            return res.json({ success: true, message: 'Endorsement draft saved.' });
        }

        if (status === 'Approved') {
            approval.status = 'Approved';
            approval.approvedBy = 'Program Chair';
            approval.approvalDate = new Date();
        }

        await approval.save();
        res.json({ success: true, message: `Endorsement submitted.` });
    } catch (err) {
        console.error('PC endorsement action error:', err);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

/* -----------------------------------------------------------------------
   GET /syllabus/prog-chair/search  →  Live Search API
   ----------------------------------------------------------------------- */
endorseSyllabusRouter.get('/search', async (req, res) => {
    const query = (req.query.q || '').trim();
    try {
        const filter = query
            ? { $or: [{ courseTitle: { $regex: query, $options: 'i' } }, { courseCode: { $regex: query, $options: 'i' } }] }
            : {};

        let courses = await Syllabus.find(filter);
        if (mainDB.models.User) await Syllabus.populate(courses, { path: 'assignedInstructor' });

        const courseIds = courses.map(c => c._id.toString());
        const approvals = await SyllabusApprovalStatus.find({ syllabusID: { $in: courseIds } });

        const formatted = courses.map(c => {
            const idStr = c._id.toString();
            const draftRecord = approvals.find(a => a.syllabusID.toString() === idStr);
            return {
                id: idStr,
                code: c.courseCode,
                title: c.courseTitle,
                instructor: c.assignedInstructor
                    ? `${c.assignedInstructor.firstName} ${c.assignedInstructor.lastName}`
                    : 'TBA',
                img: (c.courseImage && c.courseImage.startsWith('data:'))
                    ? c.courseImage
                    : `https://picsum.photos/seed/${c._id}/400/200`,
                hasDraft: !!draftRecord,
                status: draftRecord ? draftRecord.status : 'No Syllabus Draft'
            };
        });

        res.json(formatted);
    } catch (error) {
        console.error('PC Search error:', error);
        res.json([]);
    }
});

export default endorseSyllabusRouter;
