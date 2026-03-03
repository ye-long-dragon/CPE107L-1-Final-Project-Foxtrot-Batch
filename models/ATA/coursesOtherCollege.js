import { Schema, model } from "mongoose";

const coursesOtherCollegeSchema = new Schema({
  ataID: { type: Schema.Types.ObjectId, ref: "ATA", required: true },
  code: [String],
  section: [String],
  units: [Number],
  dean: [String],
  effectDate: [Date]
});

const CoursesOtherCollege = model("CoursesOtherCollege", coursesOtherCollegeSchema);
export default CoursesOtherCollege;