import { Schema, model } from "mongoose";

const courseMappingSchema = new Schema({
  syllabusID: { type: Schema.Types.ObjectId, ref: "Syllabus", required: true },
  numberOfCO: Number,
  program: String,
  conceptMap: Buffer,
  fromAtoL: [String]
});

const CourseMapping = model("CourseMapping", courseMappingSchema);
export default CourseMapping;