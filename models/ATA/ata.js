import { Schema, model } from "mongoose";

const ataSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  term: String,
  academicYear: String,
  programHead: String,
  pdf: Buffer,
  eSignatureApplier: String
},{ timestamps:true });

const ATA = model("ATA", ataSchema);
export default ATA;