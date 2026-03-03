import { Schema, model } from "mongoose";

const ataApprovalStatusSchema = new Schema({
  ataID: { type: Schema.Types.ObjectId, ref: "ATA", required: true },
  approvalDate: Date,
  status: { type: String, enum: ["Approved","Pending","Not Submitted"], default: "Not Submitted" },
  approvedBy: String,
  remarks: String,
  justification: String,
  eSignatureHRMO: String,
  eSignatureOVPAA: String,
  eSignatureDean: String
},{ timestamps:true });

const ATAApprovalStatus = model("ATAApprovalStatus", ataApprovalStatusSchema);
export default ATAApprovalStatus;