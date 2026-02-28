import mongoose from 'mongoose';

// ==========================================
// 1. EMBEDDED SUBDOCUMENTS (The Arrays)
// ==========================================

// Handles Regular, Practicum, Remedial, and Section C (Other Colleges)
const courseAssignmentSchema = new mongoose.Schema({
    courseCode: { type: String, required: true },
    section: { type: String, required: true },
    units: { type: Number, required: true },
    effectiveUnits: { type: Number, default: 0 }, // Calculated by Math Engine
    numberOfStudents: { type: Number, default: 0 },
    
    // Flags
    isPracticum: { type: Boolean, default: false },
    isRemedial: { type: Boolean, default: false },
    
    // For Section C (Other Colleges)
    originatingCollegeId: { type: String }, // Changed to String for Test Mode
    originatingDeanName: { type: String } 
});

// Handles Sections A & D (Administrative/Research Deloading)
const adminRoleSchema = new mongoose.Schema({
    roleName: { type: String, required: true },
    deloadingUnits: { type: Number, required: true },
    effectDate: { type: Date }
});

// Handles Section F (Outside Employment)
const outsideEmploymentSchema = new mongoose.Schema({
    companyName: { type: String, required: true },
    position: { type: String, required: true },
    workHours: { type: Number, required: true }
});



// Handles State Machine Audit Trail
const approvalHistorySchema = new mongoose.Schema({
    approverRole: { type: String, enum: ['CHAIR', 'PRACTICUM_COORDINATOR', 'DEAN', 'VPAAA', 'HRMO'], required: true },
    approvalStatus: { type: String, enum: ['ENDORSED', 'APPROVED', 'RETURNED'], required: true },
    remarks: { type: String }, 
    date: { type: Date, default: Date.now }
});

// ==========================================
// 2. MAIN ATA FORM SCHEMA
// ==========================================
const ataFormSchema = new mongoose.Schema({
    // TEST MODE: We use String so you can type "TEST_USER_001"
    // Later, when merging to MainDB, we will change this back to ObjectId
    userID: { type: String, required: true },
    
    // Form Metadata
    term: { type: String, default: "2nd Term 2025-2026" },
    academicYear: { type: String, default: "2025-2026" },
    submissionDate: { type: Date, default: Date.now },

    //Section G - Remedial Module Teaching Assignments
    remedialAssignments: [{
        courseCode: { type: String, required: true },
        units: { type: Number, required: true },
        numberOfStudents: { type: Number, required: true },
        type: { type: String, enum: ['lecture', 'lab'], required: true }
    }],
    totalRemedialUnits: { 
        type: Number, 
        default: 0 
    },
    
    // State Machine Status
    status: { 
        type: String, 
        enum: ['DRAFT', 'PENDING_CHAIR', 'PENDING_PRACTICUM', 'PENDING_DEAN', 'APPROVED', 'ARCHIVED'], 
        default: 'DRAFT'    
    },
    digitalSignature: { type: String },
    
    // Math Engine Totals
    totalTeachingUnits: { type: Number, default: 0 },
    totalEffectiveUnits: { type: Number, default: 0 },

    // The Embedded Arrays
    courseAssignments: [courseAssignmentSchema],
    administrativeRoles: [adminRoleSchema],
    outsideEmployment: [outsideEmploymentSchema],
    approvalHistory: [approvalHistorySchema]            

}, { timestamps: true });

// Export as ES Module
const ATAForm = mongoose.model('ATAForm', ataFormSchema);
export default ATAForm;