import { Schema, model } from "mongoose";

const syllabusSchema = new Schema({
  userID: { type: Schema.Types.ObjectId, ref: "User", required: true },
  courseCode: String,
  courseTitle: String,
  preRequisite: String,
  coRequisite: String,
  units: Number,
  classSchedule: Number,
  courseDesign: String,
  courseDescription: String,
  term: String,
  schoolYear: String,
  programPreparedFor: String,
  textbook: String,
  references: String,
  pdf: Buffer
},{ timestamps:true });

const Syllabus = model("Syllabus", syllabusSchema);
export default Syllabus;