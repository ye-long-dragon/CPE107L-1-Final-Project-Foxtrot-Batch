import ATAForm from '../models/ATA/ATAForm.js';

// ==========================================
// 🧠 1. THE MATH ENGINE (Restored Mapúa Logic)
// ==========================================
const calculateUnits = (formData) => {
    let totalTeachingUnits = 0;
    
    const sumUnits = (array) => {
        if (!array || !array.length) return 0;
        return array.reduce((sum, item) => sum + (Number(item.units) || 0), 0);
    };

    totalTeachingUnits += Number(formData.sectionA_AdminUnits) || 0; 
    totalTeachingUnits += sumUnits(formData.sectionB_WithinCollege);
    totalTeachingUnits += sumUnits(formData.sectionC_OtherCollege);
    totalTeachingUnits += sumUnits(formData.sectionD_AdminWork);

    let totalEffectiveUnits = totalTeachingUnits; 

    // 🚨 RESTORED: Mapúa Section G Remedial Formula (students/40)
    let totalRemedialUnits = 0;
    if (formData.sectionG_Remedial && formData.sectionG_Remedial.length > 0) {
        for (const course of formData.sectionG_Remedial) {
            const students = Number(course.numberOfStudents) || 0;
            const units = Number(course.units) || 0;
            const courseType = course.type; 

            if (courseType === 'lecture') {
                totalRemedialUnits += units * (students / 40);
            } else if (courseType === 'lab') {
                totalRemedialUnits += 2 * units * (students / 40);
            }
        }
    }
    
    return { totalTeachingUnits, totalEffectiveUnits, totalRemedialUnits };
};

// ==========================================
// 📝 2. CREATE / SUBMIT ATA 
// ==========================================
export const submitATA = async (req, res) => { 
    try {
        const formData = req.body; 
        
        // 👇 The Ultimate ID Catcher: It tries the MongoDB _id first, then id, then the employeeId!
        const userID = req.user._id || req.user.id || req.user.employeeId;

        if (!userID) {
            return res.status(400).json({ error: "Could not detect your User ID from the session." });
        }

        const totals = calculateUnits(formData);

        // 🚨 RESTORED: ENFORCE MAX 6 REMEDIAL UNITS RULE
        if (totals.totalRemedialUnits > 6) {
            return res.status(400).json({ 
                error: `Remedial limit exceeded. You have ${totals.totalRemedialUnits.toFixed(2)} effective units, max is 6.` 
            });
        }

        let newStatus = 'DRAFT';
        if (formData.action === 'SUBMIT') {
            newStatus = 'PENDING_CHAIR';
        }

        const newForm = new ATAForm({
            userID: userID,
            facultyName: formData.facultyName, 
            position: formData.position,
            college: formData.college,
            employmentType: formData.employmentType,
            sectionA_AdminUnits: formData.sectionA_AdminUnits || 0,
            address: formData.address,
            term: formData.term,
            academicYear: formData.academicYear,
            
            sectionB_WithinCollege: formData.sectionB_WithinCollege,
            sectionC_OtherCollege: formData.sectionC_OtherCollege,
            sectionD_AdminWork: formData.sectionD_AdminWork,
            sectionE_Practicum: formData.sectionE_Practicum,
            sectionF_OutsideEmployment: formData.sectionF_OutsideEmployment,
            sectionG_Remedial: formData.sectionG_Remedial,

            totalTeachingUnits: totals.totalTeachingUnits,
            totalEffectiveUnits: totals.totalEffectiveUnits,
            totalRemedialUnits: totals.totalRemedialUnits,
            status: newStatus
        });

        await newForm.save(); 
        res.status(201).json({ message: "ATA Form saved successfully!", data: newForm });

    } catch (error) {
        console.error("Error submitting ATA:", error);
        res.status(500).json({ error: "Failed to submit ATA Form" });
    }
};

// ==========================================
// 🚦 3. ENDORSE / APPROVE / RETURN (The State Machine)
// ==========================================
export const approveATA = async (req, res) => {
    try {
        const { action, remarks } = req.body;
        const formId = req.params.id;
        const approverRole = req.user.role; 

        const form = await ATAForm.findById(formId);
        if (!form) return res.status(404).json({ error: "ATA Form not found." });

        let newStatus = form.status;
        let historyStatus = '';

        // ⏪ DRAFT RECOVERY & REMARKS LOGIC (Tasks 1 & 2 Fixed)
        if (action === 'RETURN') {
            if (!remarks || remarks.trim() === '') {
                return res.status(400).json({ error: "Remarks are strictly required when returning a form." });
            }
            newStatus = 'DRAFT';
            historyStatus = 'RETURNED';
        } 
        // ⏩ FORWARD PROGRESSION (Strict checking so UI can't cheat)
        else {
            switch (form.status) {
                case 'PENDING_CHAIR':
                    if (approverRole === 'Program-Chair' && action === 'ENDORSE') {
                        // Task 4 Fixed: Practicum Routing
                        const hasPracticum = form.sectionE_Practicum && form.sectionE_Practicum.length > 0;
                        newStatus = hasPracticum ? 'PENDING_PRACTICUM' : 'PENDING_DEAN';
                        historyStatus = 'ENDORSED';
                    } else return res.status(403).json({ error: "Invalid action for Chair." });
                    break;

                case 'PENDING_PRACTICUM':
                    if (approverRole === 'Practicum-Coordinator' && action === 'VALIDATE') {
                        newStatus = 'PENDING_DEAN';
                        historyStatus = 'VALIDATED'; // Schema update used here!
                    } else return res.status(403).json({ error: "Invalid action for Practicum Coordinator." });
                    break;

                case 'PENDING_DEAN':
                    if (approverRole === 'Dean' && action === 'APPROVE') {
                        newStatus = 'PENDING_VPAA';
                        historyStatus = 'APPROVED';
                    } else return res.status(403).json({ error: "Invalid action for Dean." });
                    break;

                case 'PENDING_VPAA':
                    // Task 3 Fixed: VPAA Final Approval
                    if (approverRole === 'VPAA' && action === 'NOTE') {
                        newStatus = 'FINALIZED';
                        historyStatus = 'NOTED'; // Schema update used here!
                    } else return res.status(403).json({ error: "Invalid action for VPAA." });
                    break;

                default:
                    return res.status(400).json({ error: "Form cannot be moved from its current state." });
            }
        }

        form.status = newStatus;
        form.approvalHistory.push({
            approverRole,
            approvalStatus: historyStatus,
            remarks: remarks || "",
            date: Date.now()
        });

        await form.save();
        res.status(200).json({ message: `Success! Form is now ${newStatus}` });

    } catch (error) { 
        console.error(error);
        res.status(500).json({ error: error.message }); 
    }
};

// ==========================================
// 📥 4. GET PENDING APPROVALS (The Inbox)
// ==========================================
export const getPendingApprovals = async (req, res) => {
    try {
        const userRole = req.user.role || "Professor"; 
        
        // 👇 The Fix: Look for "program" first, then "department", with a fail-safe fallback!
        const userProgram = req.user.program || req.user.department || req.user.college || "CpE"; 

        let query = {};

        if (userRole === 'Program-Chair') {
            // Now it will correctly search for college: "CpE"
            query = { status: 'PENDING_CHAIR', college: userProgram }; 
        } else if (userRole === 'Practicum-Coordinator') {
            query = { status: 'PENDING_PRACTICUM' }; 
        } else if (userRole === 'Dean') {
            query = { status: 'PENDING_DEAN' }; 
        } else if (userRole === 'VPAA') {
            query = { status: 'PENDING_VPAA' }; 
        }

        const pendingForms = await ATAForm.find(query).sort({ createdAt: -1 });

        res.render('ATA/pending-approvals', {
            forms: pendingForms,
            role: userRole,
            college: userProgram
        });

    } catch (error) {
        console.error("Error fetching pending forms:", error);
        res.status(500).send("Failed to load pending forms.");
    }
};

// ==========================================
// 📄 5. VIEW SPECIFIC FORM (Read-Only)
// ==========================================
export const viewATAForm = async (req, res) => {
    try {
        const form = await ATAForm.findById(req.params.id);
        if (!form) return res.status(404).send("Form not found");
        
        res.render('ATA/review-ata', { form: form, role: req.user.role });
    } catch (error) {
        console.error("Error fetching form:", error);
        res.status(500).send("Failed to load form.");
    }
};