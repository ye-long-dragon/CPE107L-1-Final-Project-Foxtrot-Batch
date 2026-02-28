import {
    TLA_Main,   TLA_B1,   TLA_B2,
    Status_Main,Status_B1,Status_B2,
    Pre_Main,   Pre_B1,   Pre_B2,
    Post_Main,  Post_B1,  Post_B2
} from '../models/TLA/tlaModels.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PDF_TEMPLATE = join(__dirname, '../public/common/img/TLA_TEMPLATE_BLANK.pdf');

// ─── Auth guard ─────────────────────────────────────────────────────────────
export function requireLogin(req, res, next) {
    if (!req.session?.user) return res.redirect('/login');
    next();
}

// ─── Strip _id for backup copies ────────────────────────────────────────────
function stripId(doc) {
    const d = doc.toObject ? doc.toObject() : { ...doc };
    delete d._id;
    return d;
}

// ─── GET /tla/dashboard ──────────────────────────────────────────────────────
// Renders the dashboard with the logged-in user's TLA week cards.
export async function getDashboard(req, res) {
    try {
        const userID = req.session.user.id;

        // Fetch all TLA docs for this user, sorted by week
        const tlas = await TLA_Main.find({ userID }).sort({ weekNumber: 1 });
        const tlaIDs = tlas.map(t => t._id);

        // Fetch approval statuses in one query
        const statuses = await Status_Main.find({ tlaID: { $in: tlaIDs } });

        // Build a map: tlaID (string) → status string
        const statusMap = {};
        for (const s of statuses) {
            statusMap[s.tlaID.toString()] = s.status;
        }

        // Attach status to each tla for easier EJS rendering
        const weeks = tlas.map(t => ({
            _id: t._id,
            weekNumber: t.weekNumber,
            courseCode: t.courseCode,
            section: t.section,
            dateofDigitalDay: t.dateofDigitalDay,
            status: statusMap[t._id.toString()] || 'Not Submitted'
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

// ─── GET /tla/form ───────────────────────────────────────────────────────────
// Renders a blank new TLA form.
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

// ─── GET /tla/form/:id ───────────────────────────────────────────────────────
// Renders the form pre-filled with an existing TLA.
export async function getFormById(req, res) {
    try {
        const tla = await TLA_Main.findById(req.params.id);
        if (!tla) return res.status(404).send('TLA not found');

        // Verify ownership
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
            preDigital: preDigital || null,
            postDigital: postDigital || null,
            status: status || null
        });
    } catch (error) {
        console.error('getFormById error:', error);
        res.status(500).send('Server error');
    }
}

// ─── POST /tla/form ──────────────────────────────────────────────────────────
// Creates a new TLA with its pre-digital session and a "Draft" approval status.
export async function createTLA(req, res) {
    try {
        const {
            courseCode, section, dateofDigitalDay, facultyFacilitating,
            courseOutcomes, mediatingOutcomes, weekNumber,
            // Pre-digital
            pre_moIloCode, pre_teacherLearningActivity, pre_lmsDigitalTool, pre_assessment,
            // Submit vs save
            action
        } = req.body;

        const userID = req.session.user.id;
        const tlaStatus = action === 'submit' ? 'Pending' : 'Draft';

        // 1. Create TLA
        const newTLA = await TLA_Main.create({
            courseCode, section, dateofDigitalDay, facultyFacilitating,
            courseOutcomes, mediatingOutcomes, weekNumber: weekNumber || null,
            userID, status: tlaStatus
        });
        const tlaBackup = stripId(newTLA);
        await Promise.all([ TLA_B1.create(tlaBackup), TLA_B2.create(tlaBackup) ]);

        // 2. Create Pre-Digital Session
        const preDoc = await Pre_Main.create({
            tlaID: newTLA._id,
            moIloCode: pre_moIloCode,
            teacherLearningActivity: pre_teacherLearningActivity,
            lmsDigitalTool: pre_lmsDigitalTool,
            assessment: pre_assessment
        });
        const preBackup = stripId(preDoc);
        await Promise.all([ Pre_B1.create(preBackup), Pre_B2.create(preBackup) ]);

        // 3. Create Approval Status stub
        const approvalStatus = action === 'submit' ? 'Pending' : 'Not Submitted';
        const statusDoc = await Status_Main.create({ tlaID: newTLA._id, status: approvalStatus });
        const statusBackup = stripId(statusDoc);
        await Promise.all([ Status_B1.create(statusBackup), Status_B2.create(statusBackup) ]);

        res.redirect('/tla/overview');
    } catch (error) {
        console.error('createTLA error:', error);
        res.status(500).send('Server error');
    }
}

// ─── POST /tla/form/:id ──────────────────────────────────────────────────────
// Updates an existing TLA with pre/post-digital sessions.
export async function updateTLA(req, res) {
    try {
        const { id } = req.params;
        const {
            courseCode, section, dateofDigitalDay, facultyFacilitating,
            courseOutcomes, mediatingOutcomes, weekNumber,
            // Pre-digital
            pre_moIloCode, pre_teacherLearningActivity, pre_lmsDigitalTool, pre_assessment,
            // Post-digital
            post_moIloCode, post_participantTurnout, post_assessmentResults, post_remarks,
            // Submit vs save
            action
        } = req.body;

        const tla = await TLA_Main.findById(id);
        if (!tla) return res.status(404).send('TLA not found');

        // Ownership check
        if (tla.userID.toString() !== req.session.user.id) {
            return res.status(403).send('Forbidden');
        }

        // Block edits on archived records only; Approved allows post-digital editing
        if (tla.status === 'Archived') {
            return res.status(403).send('Cannot edit an Archived TLA');
        }

        const isPostSubmit = action === 'submit-post';
        const isSubmit     = action === 'submit';
        const isDraft      = action === 'draft';

        // If status is Approved, only post-digital edits are allowed
        const isApproved = tla.status === 'Approved' || tla.status === 'Returned';

        let tlaStatus = tla.status; // default: keep current status
        if (isDraft && !isApproved)   tlaStatus = 'Draft';
        if (isSubmit && !isApproved)  tlaStatus = 'Pending';

        // 1. Update TLA (skip if this is a post-digital-only submission)
        if (!isPostSubmit) {
            const tlaUpdate = {
                courseCode, section, dateofDigitalDay, facultyFacilitating,
                courseOutcomes, mediatingOutcomes, weekNumber: weekNumber || null,
                status: tlaStatus
            };
            await Promise.all([
                TLA_Main.findByIdAndUpdate(id, tlaUpdate),
                TLA_B1.findByIdAndUpdate(id, tlaUpdate),
                TLA_B2.findByIdAndUpdate(id, tlaUpdate)
            ]);

            // 2. Upsert Pre-Digital
            const preUpdate = {
                tlaID: id,
                moIloCode: pre_moIloCode,
                teacherLearningActivity: pre_teacherLearningActivity,
                lmsDigitalTool: pre_lmsDigitalTool,
                assessment: pre_assessment
            };
            await Promise.all([
                Pre_Main.findOneAndUpdate({ tlaID: id }, preUpdate, { upsert: true }),
                Pre_B1.findOneAndUpdate({ tlaID: id }, preUpdate, { upsert: true }),
                Pre_B2.findOneAndUpdate({ tlaID: id }, preUpdate, { upsert: true })
            ]);
        }

        // 3. Upsert Post-Digital (on submit, submit-post, or when Approved)
        if (isSubmit || isPostSubmit || isApproved) {
            const postUpdate = {
                tlaID: id,
                moIloCode: post_moIloCode,
                participantTurnout: post_participantTurnout,
                assessmentResults: post_assessmentResults,
                remarks: post_remarks
            };
            await Promise.all([
                Post_Main.findOneAndUpdate({ tlaID: id }, postUpdate, { upsert: true }),
                Post_B1.findOneAndUpdate({ tlaID: id }, postUpdate, { upsert: true }),
                Post_B2.findOneAndUpdate({ tlaID: id }, postUpdate, { upsert: true })
            ]);
        }

        // 4. Update approval status
        let approvalStatus = null;
        if (isDraft && !isApproved)         approvalStatus = 'Not Submitted';
        else if (isSubmit && !isApproved)   approvalStatus = 'Pending';
        // submit-post or isApproved: keep existing approval status

        if (approvalStatus) {
            const statusUpdate = { status: approvalStatus };
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

// ─── GET /tla/overview ───────────────────────────────────────────────────────
export async function getOverview(req, res) {
    try {
        const userID = req.session.user.id;

        const tlas = await TLA_Main.find({ userID }).sort({ weekNumber: 1 });
        const tlaIDs = tlas.map(t => t._id);
        const statuses = await Status_Main.find({ tlaID: { $in: tlaIDs } });

        const statusMap = {};
        for (const s of statuses) {
            statusMap[s.tlaID.toString()] = s.status;
        }

        // Build a map keyed by weekNumber for quick lookup
        const weekMap = {};
        for (const t of tlas) {
            if (t.weekNumber) {
                weekMap[t.weekNumber] = {
                    _id: t._id,
                    status: statusMap[t._id.toString()] || 'Not Submitted'
                };
            }
        }

        // Build all 14 week slots
        const weeks = [];
        for (let w = 1; w <= 14; w++) {
            if (weekMap[w]) {
                weeks.push({ weekNumber: w, _id: weekMap[w]._id, status: weekMap[w].status });
            } else {
                weeks.push({ weekNumber: w, _id: null, status: 'Not Submitted' });
            }
        }

        res.render('TLA/tlaOverview', {
            currentPageCategory: 'tla',
            user: req.session.user,
            weeks
        });
    } catch (error) {
        console.error('getOverview error:', error);
        res.status(500).send('Server error');
    }
}

// ─── POST /tla/form/generate-docx ────────────────────────────────────────────
// Overlays form values onto the blank PDF template and serves the result as PDF.
export async function generateDocx(req, res) {
    try {
        const b    = req.body;
        const user = req.session.user;
        const faculty = b.facultyFacilitating ||
                        (user ? `${user.firstName} ${user.lastName}` : '');

        // ── Load the blank PDF template ────────────────────────────────────
        const templateBytes = readFileSync(PDF_TEMPLATE);
        const pdfDoc = await PDFDocument.load(templateBytes);
        const page   = pdfDoc.getPages()[0];          // single-page template
        const font   = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const black  = rgb(0, 0, 0);

        // ── Helper: draw text (single line) ────────────────────────────────
        const draw = (txt, x, y, { size = 9, f = font, color = black, maxWidth } = {}) => {
            if (!txt) return;
            // Truncate to fit maxWidth if provided
            if (maxWidth) {
                while (f.widthOfTextAtSize(txt, size) > maxWidth && txt.length > 1) {
                    txt = txt.slice(0, -1);
                }
            }
            page.drawText(txt, { x, y, size, font: f, color });
        };

        // ── Helper: draw multi-line wrapped text in a cell ─────────────────
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

        // ════════════════════════════════════════════════════════════════════
        //  FIELD POSITIONS  (derived from the blank PDF's text & rectangle
        //  coordinates; all values in PDF points, origin = bottom-left)
        // ════════════════════════════════════════════════════════════════════

        // Row 1 — COURSE(S) / SECTION(S) / DATE  (cell y=729.2 → 751.2)
        draw(b.courseCode || '',      113, 737, { size: 9, maxWidth: 105 });
        draw(b.section || '',         290, 737, { size: 9, maxWidth: 110 });
        draw(b.dateofDigitalDay || '', 410, 732, { size: 9, maxWidth: 145 });

        // Row 2 — FACULTY  (cell y=714.6 → 728.8)
        draw(faculty,                 250, 718, { size: 9, maxWidth: 305 });

        // Row 3 — COURSE OUTCOME(S)  (cell y=693.7 → 714.1)
        drawWrapped(b.courseOutcomes || '', 148, 705, 407, { size: 8, lineH: 9 });

        // Row 4+5 — MEDIATING/INTENDED LEARNING OUTCOME(S)  (cell y=663 → 693.3)
        drawWrapped(b.mediatingOutcomes || '', 56, 671, 498, { size: 8, lineH: 9 });

        // ── PRE-DIGITAL SESSION table ──────────────────────────────────────
        // Data area: y=427.4 → 599.1  |  Columns:
        //   Col1 MO/ILO CODE        x=50.6 → 123.3  (w≈73)
        //   Col2 TEACHING-LEARNING   x=123.9 → 326.5 (w≈203)
        //   Col3 LMS/DIGITAL TOOL    x=327  → 436.1  (w≈109)
        //   Col4 ASSESSMENT           x=436.5 → 558.0 (w≈122)
        const preY = 585;
        drawWrapped(b.pre_moIloCode || '',               55, preY, 65,  { size: 8 });
        drawWrapped(b.pre_teacherLearningActivity || '', 128, preY, 195, { size: 8 });
        drawWrapped(b.pre_lmsDigitalTool || '',          331, preY, 103, { size: 8 });
        drawWrapped(b.pre_assessment || '',              441, preY, 113, { size: 8 });

        // ── POST-DIGITAL SESSION table ─────────────────────────────────────
        // Data area: y=197.4 → 319.3  |  Columns:
        //   Col1 MO/ILO CODE          x=51.1 → 123.7  (w≈73)
        //   Col2 PARTICIPANT TURNOUT   x=124.2 → 326.7 (w≈203)
        //   Col3 ASSESSMENT RESULTS    x=327.2 → 436.5 (w≈109)
        //   Col4 REMARKS              x=437  → 558.3  (w≈121)
        const postY = 305;
        drawWrapped(b.post_moIloCode || '',          55,  postY, 65,  { size: 8 });
        drawWrapped(b.post_participantTurnout || '', 128, postY, 195, { size: 8 });
        drawWrapped(b.post_assessmentResults || '',  331, postY, 103, { size: 8 });
        drawWrapped(b.post_remarks || '',            441, postY, 113, { size: 8 });

        // ── Serialize & send ───────────────────────────────────────────────
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
