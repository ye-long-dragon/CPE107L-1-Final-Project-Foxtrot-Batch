import { Schema, model } from "mongoose";

const twsApprovalStatusSchema = new Schema({
  twsID: { type: Schema.Types.ObjectId, ref: "TWS", required: true },
  approvalDate: Date,
  remarks: String,
  approvedBy: String,
  status: { type: String, enum: ["Approved","Pending","Not Submitted"], default: "Not Submitted" }
},{ timestamps:true });

const TWSApprovalStatus = model("TWSApprovalStatus", twsApprovalStatusSchema);
export default TWSApprovalStatus;