
const mongoose = require('mongoose');

// ==========================================
// 1. EMBEDDED SUBDOCUMENTS (The Arrays)
// ==========================================

// Handles Regular, Practicum, Remedial, and Section C (Other Colleges)
const courseAssignmentSchema = new mongoose.Schema({
    courseCode: { type: String, required: true },
    section: { type: String, required: true },
    units: { type: Number, required: true },
    effectiveUnits: { type: Number, required: true }, // Calculated by Math Engine
    numberOfStudents: { type: Number, default: 0 },
    
    // Flags to differentiate the load type (Replaces parallel arrays)
    isPracticum: { type: Boolean, default: false },
    isRemedial: { type: Boolean, default: false },
    
    // For Section C (Other Colleges)
    originatingCollegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College' },
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

// Handles State Machine Audit Trail (Replaces hardcoded signature columns)
const approvalHistorySchema = new mongoose.Schema({
    approverRole: { type: String, enum: ['CHAIR', 'DEAN', 'VPAA', 'HRMO'], required: true },
    approvalStatus: { type: String, enum: ['ENDORSED', 'APPROVED', 'RETURNED'], required: true },
    remarks: { type: String }, // Optional feedback if returned to faculty
    date: { type: Date, default: Date.now }
});

// ==========================================
// 2. MAIN ATA FORM SCHEMA
// ==========================================
const ataFormSchema = new mongoose.Schema({
    // Connection to the master User table (Classname)
    userID: { type: mongoose.Schema.Types.ObjectId, ref: 'Classname', required: true },
    
    // Form Metadata
    term: { type: String, required: true },
    academicYear: { type: String, required: true },
    submissionDate: { type: Date, default: Date.now },
    
    // State Machine Status
    status: { 
        type: String, 
        enum: ['DRAFT', 'PENDING_CHAIR', 'PENDING_DEAN', 'APPROVED', 'ARCHIVED'], 
        default: 'DRAFT' 
    },
    digitalSignature: { type: String },
    
    // Math Engine Totals (Calculated before saving)
    totalTeachingUnits: { type: Number, default: 0 },
    totalEffectiveUnits: { type: Number, default: 0 },

    // The Embedded Arrays (Composition)
    courseAssignments: [courseAssignmentSchema],
    administrativeRoles: [adminRoleSchema],
    outsideEmployment: [outsideEmploymentSchema],
    approvalHistory: [approvalHistorySchema]

}, { timestamps: true });

module.exports = mongoose.model('ATAForm', ataFormSchema);