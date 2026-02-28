import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const syllabusSchema = new Schema({
  userID: { type: Schema.Types.ObjectId, ref: "User", required: true },
  courseCode: String,
  courseTitle: String,
  assignedInstructor: { type: Schema.Types.ObjectId, ref: "User" },
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
  pdf: Buffer,
  courseImage: String
}, { timestamps: true });

const Syllabus = models.Syllabus || model("Syllabus", syllabusSchema);

export default Syllabus;