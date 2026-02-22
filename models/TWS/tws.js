import { Schema, model } from "mongoose";

const twsSchema = new Schema({
  userID: { type: Schema.Types.ObjectId, ref: "User", required: true },
  term: String,
  schoolYear: String,
  teachingHours: Number,
  advisingHours: Number,
  consultationHours: Number,
  committeeWorks: Number,
  totalHours: Number,
  academicUnits: Number,
  peUnits: Number,
  nstpUnits: Number,
  deloadingUnits: Number,
  totalUnits: Number,
  immediateHead: String,
  pdf: Buffer
},{ timestamps:true });

const TWS = model("TWS", twsSchema);
export default TWS;