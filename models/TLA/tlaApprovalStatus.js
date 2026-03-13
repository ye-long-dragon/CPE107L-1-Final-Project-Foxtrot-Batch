import { Schema, model } from "mongoose";

// ─── Sub-schema for a single approval step ───────────────────────────────────
const stepSchema = new Schema({
    status:       { type: String, enum: ["Pending", "Approved", "Returned", "Archived"], default: "Pending" },
    approvedBy:   { type: String, default: "" },
    approvalDate: { type: Date },
    remarks:      { type: String, default: "" }
}, { _id: false });

// ─── Main approval status document ───────────────────────────────────────────
// Tracks the full organizational approval chain for one TLA:
//   Faculty → Technical Assistant → Program Chair → Dean → HR (Archival)
const tlaApprovalStatusSchema = new Schema({
    tlaID: { type: Schema.Types.ObjectId, ref: "TLA", required: true },

    // ── Macro status (for fast querying / badge display) ─────────────────────
    // Progresses forward as each step is approved.
    // Returning at any step resets to "Returned".
    status: {
        type: String,
        enum: [
            "Not Submitted",    // Faculty has not yet submitted
            "Pending",          // Submitted by faculty, awaiting Technical review
            "Tech-Approved",    // Technical forwarded to Program Chair
            "Chair-Approved",   // Program Chair forwarded to Dean
            "Dean-Approved",    // Dean approved, ready for HR to archive
            "Archived",         // HR has archived — fully completed
            "Returned"          // Returned to faculty at any step
        ],
        default: "Not Submitted"
    },

    // ── Per-step tracking ─────────────────────────────────────────────────────
    technical:   { type: stepSchema, default: () => ({}) },
    programChair:{ type: stepSchema, default: () => ({}) },
    dean:        { type: stepSchema, default: () => ({}) },
    hr:          { type: stepSchema, default: () => ({}) },

    // ── Legacy flat fields (kept for backward-compatibility) ─────────────────
    approvalDate: Date,
    remarks:      String,
    approvedBy:   String
}, { timestamps: true });

const TLAApprovalStatus = model("TLAApprovalStatus", tlaApprovalStatusSchema);
export { tlaApprovalStatusSchema };
export default TLAApprovalStatus;