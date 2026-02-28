const ATAForm = require('../models/ATAForm');

// ==========================================
// 🧠 THE MATH ENGINE (Helper Function)
// ==========================================
const calculateUnits = (courseAssignments) => {
    let totalTeachingUnits = 0;
    let totalEffectiveUnits = 0;
    
    // TODO: Bonzo will send the array of classes. 
    // You will write the loop here to add up the units before saving.
    
    return { totalTeachingUnits, totalEffectiveUnits };
};

// ==========================================
// 📝 1. CREATE / SUBMIT ATA (Faculty Action)
// ==========================================
exports.submitATA = async (req, res) => {
    try {
        // 1. Catch the JSON payload from Bonzo's frontend
        const { term, academicYear, courseAssignments, action } = req.body;
        const userID = req.user._id; // We will get this from your Auth Middleware later

        // 2. Run the Math Engine
        const totals = calculateUnits(courseAssignments || []);

        // 3. The State Machine (Initial Phase)
        // If they click "Save Draft", stay DRAFT. If "Submit", move to PENDING_CHAIR.
        let newStatus = 'DRAFT';
        if (action === 'SUBMIT') {
            newStatus = 'PENDING_CHAIR';
        }

        // 4. Package it for the database
        const newForm = new ATAForm({
            userID,
            term,
            academicYear,
            courseAssignments,
            totalTeachingUnits: totals.totalTeachingUnits,
            totalEffectiveUnits: totals.totalEffectiveUnits,
            status: newStatus
        });

        // 5. Save to Database 
        // Note: Check with Bastasa if Mongoose handles the mainDB/backup replication automatically here!
        await newForm.save(); 

        res.status(201).json({ message: "ATA Form saved successfully!", data: newForm });

    } catch (error) {
        console.error("Error submitting ATA:", error);
        res.status(500).json({ error: "Failed to submit ATA Form" });
    }
};

// ==========================================
// 🚦 2. ENDORSE / APPROVE / RETURN (Admin Action)
// ==========================================
exports.updateFormStatus = async (req, res) => {
    try {
        const formId = req.params.id;
        const { action, remarks } = req.body; // e.g., action = 'ENDORSE' or 'RETURN'
        const approverRole = req.user.role; // e.g., 'CHAIR' or 'DEAN'

        // 1. Fetch the form (Asst Lead Rule: Reads hit mainDB only)
        const form = await ATAForm.findById(formId);
        if (!form) return res.status(404).json({ error: "Form not found" });

        // 2. The State Machine (Switch-Case Logic goes here!)
        // TODO: Write your rules mapping what happens when a Chair vs. Dean clicks a button.
        /* Example Stub:
           if (approverRole === 'CHAIR' && action === 'ENDORSE' && form.status === 'PENDING_CHAIR') {
               form.status = 'PENDING_DEAN';
           }
        */

        // 3. Update the Audit Trail (Push the new signature into the array)
        form.approvalHistory.push({
            approverRole: approverRole,
            approvalStatus: action, 
            remarks: remarks || ""
        });

        // 4. Save updates to the DB
        await form.save();

        res.status(200).json({ message: "Form status updated!", data: form });

    } catch (error) {
        console.error("Error updating status:", error);
        res.status(500).json({ error: "Failed to update form status" });
    }
};