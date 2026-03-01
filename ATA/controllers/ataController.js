import ATAForm from '../models/ATAForm.js'; 

// ==========================================
// 🧠 THE MATH ENGINE (Helper Function)
// ==========================================
// const calculateUnits = (courseAssignments) => {
//     let totalTeachingUnits = 0;
//     let totalEffectiveUnits = 0;
    
//     // TODO: Bonzo will send the array of classes. 
//     // You will write the loop here to add up the units before saving.
    
//     return { totalTeachingUnits, totalEffectiveUnits };
// };

// ==========================================
// 🧠 THE MATH ENGINE
// ==========================================
const calculateUnits = (formData) => {
    let totalTeachingUnits = 0;
    
    const sumUnits = (array) => {
        if (!array || !array.length) return 0;
        return array.reduce((sum, item) => sum + (Number(item.units) || 0), 0);
    };

    // 👇 Calculate A, B, C, and D 👇
    totalTeachingUnits += Number(formData.sectionA_AdminUnits) || 0; // Added Section A!
    totalTeachingUnits += sumUnits(formData.sectionB_WithinCollege);
    totalTeachingUnits += sumUnits(formData.sectionC_OtherCollege);
    totalTeachingUnits += sumUnits(formData.sectionD_AdminWork);

    let totalEffectiveUnits = totalTeachingUnits; 
    let totalRemedialUnits = sumUnits(formData.sectionG_Remedial);
    
    return { totalTeachingUnits, totalEffectiveUnits, totalRemedialUnits };
};
// ==========================================
// 📝 1. CREATE / SUBMIT ATA 
// ==========================================
export const submitATA = async (req, res) => { 
    try {
        const formData = req.body; 
        const userID = req.user._id; 

        const totals = calculateUnits(formData);

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
// 🚦 5. ENDORSE / APPROVE / RETURN (Admin Action)
// ==========================================
export const approveATA = async (req, res) => {
    try {
        const { action, remarks, targetStatus } = req.body;
        const form = await ATAForm.findById(req.params.id);
        const approverRole = req.user.role;

        if (action === 'RETURN') {
            form.status = 'DRAFT';
        } else if (action === 'ENDORSE') {
            // If the UI sent a specific target (like Skip to Dean), use it.
            // Otherwise, use the smart logic.
            if (targetStatus) {
                form.status = targetStatus;
            } else {
                const hasPracticum = form.sectionE_Practicum?.length > 0;
                form.status = hasPracticum ? 'PENDING_PRACTICUM' : 'PENDING_DEAN';
            }
        }

        form.approvalHistory.push({
            approverRole,
            approvalStatus: action === 'RETURN' ? 'RETURNED' : 'ENDORSED',
            remarks: remarks || ""
        });

        await form.save();
        res.status(200).json({ message: "Success" });
    } catch (error) { res.status(500).json({ error: error.message }); }
};
// ==========================================
// 📥 3. GET PENDING APPROVALS (The Inbox)
// ==========================================
export const getPendingApprovals = async (req, res) => {
    try {
        const userRole = req.user.role; 
        const userProgram = req.user.program; // 👈 Now pulling "CpE" from Marites's profile

        let query = {};

        // 👇 STRICT BUSINESS LOGIC: Match the Program 👇
        if (userRole === 'Program-Chair') {
            query = { 
                status: 'PENDING_CHAIR', 
                college: userProgram // Looking for forms where the user typed "CpE"
            };
        } 
        else if (userRole === 'Dean') {
            query = { 
                status: 'PENDING_DEAN', 
                // Deans usually oversee the whole department (CEA), but we'll keep it simple forn ow
            };
        }

        const pendingForms = await ATAForm.find(query).sort({ createdAt: -1 });

        res.render('pending-approvals', {
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
// 📄 4. VIEW SPECIFIC FORM (Read-Only)
// ==========================================
export const viewATAForm = async (req, res) => {
    try {
        const form = await ATAForm.findById(req.params.id);
        if (!form) return res.status(404).send("Form not found");
        
        // Render the review page and pass the form data
        res.render('review-ata', { form: form, role: req.user.role });
    } catch (error) {
        console.error("Error fetching form:", error);
        res.status(500).send("Failed to load form.");
    }
};