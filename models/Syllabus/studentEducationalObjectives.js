import { Schema, model } from "mongoose";

const studentEducationalObjectivesSchema = new Schema({
  syllabusID: { type: Schema.Types.ObjectId, ref: "Syllabus", required: true },
  description: [String],
  rating: [String]
});

const StudentEducationalObjectives = model("StudentEducationalObjectives", studentEducationalObjectivesSchema);
export default StudentEducationalObjectives;