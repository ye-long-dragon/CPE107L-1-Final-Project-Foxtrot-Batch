import { Schema, model } from "mongoose";

const remedialSchema = new Schema({
  ataID: { type: Schema.Types.ObjectId, ref: "ATA", required: true },
  courseId: [String],
  moduleCode: [String],
  section: [Number],
  units: [Number],
  noOfStudents: [Number],
  effectiveUnits: [Number]
});

const Remedial = model("Remedial", remedialSchema);
export default Remedial;