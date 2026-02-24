import { Schema, model } from "mongoose";

const adminResearchWorkSchema = new Schema({
  ataID: { type: Schema.Types.ObjectId, ref: "ATA", required: true },
  effectDate: [Date],
  units: [Number],
  name: [String]
});

const AdminResearchWork = model("AdminResearchWork", adminResearchWorkSchema);
export default AdminResearchWork;