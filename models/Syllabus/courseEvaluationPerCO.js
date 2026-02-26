import { Schema, model } from "mongoose";

const courseEvaluationPerCOSchema = new Schema({
  syllabusID: { type: Schema.Types.ObjectId, ref: "Syllabus", required: true },
  coNumber: String,
  moduleCode: String,
  onlineTaskWeight: Number,
  longExaminationWeight: Number,
  finalProjectWeight: Number,
  moduleWeight: Number,
  finalWeight: Number
});

const CourseEvaluationPerCO = model("CourseEvaluationPerCO", courseEvaluationPerCOSchema);
export default CourseEvaluationPerCO;