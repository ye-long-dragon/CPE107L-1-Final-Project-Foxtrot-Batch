import { Schema, model } from "mongoose";

const employmentOutsideSchema = new Schema({
  ataID: { type: Schema.Types.ObjectId, ref: "ATA", required: true },
  employer: [String],
  hours: [String],
  units: [Number],
  subjects: [String],
  courseCode: [String],
  positionOrStatus: [String]
});

const EmploymentOutside = model("EmploymentOutside", employmentOutsideSchema);
export default EmploymentOutside;