import { Schema, model } from "mongoose";

const programEducationalObjectivesSchema = new Schema({
  syllabusID: { type: Schema.Types.ObjectId, ref: "Syllabus", required: true },
  description: [String],
  rating: [String]
});

const ProgramEducationalObjectives = model("ProgramEducationalObjectives", programEducationalObjectivesSchema);
export default ProgramEducationalObjectives;