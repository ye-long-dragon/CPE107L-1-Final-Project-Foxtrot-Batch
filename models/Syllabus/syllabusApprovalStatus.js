import mongoose from "mongoose";
const { Schema, model, models } = mongoose;

const syllabusApprovalStatusSchema = new Schema({
  syllabusID: { type: Schema.Types.ObjectId, ref: "Syllabus", required: true },
  status: { type: String, enum: ["Approved", "Pending", "Not Submitted"], default: "Not Submitted" },
  approvalDate: Date,
  remarks: String,
  approvedBy: String
}, { timestamps: true });

const SyllabusApprovalStatus = models.SyllabusApprovalStatus || model("SyllabusApprovalStatus", syllabusApprovalStatusSchema);
export default SyllabusApprovalStatus;