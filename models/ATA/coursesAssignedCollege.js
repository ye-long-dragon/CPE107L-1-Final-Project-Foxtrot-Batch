import { Schema, model } from "mongoose";

const coursesAssignedCollegeSchema = new Schema({
  ataID: { type: Schema.Types.ObjectId, ref: "ATA", required: true },
  code: [String],
  effectDate: [Date],
  units: [Number],
  section: [String]
});

const CoursesAssignedCollege = model("CoursesAssignedCollege", coursesAssignedCollegeSchema);
export default CoursesAssignedCollege;