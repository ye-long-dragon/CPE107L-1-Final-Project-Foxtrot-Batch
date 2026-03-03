import { Schema, model } from "mongoose";

const coOutcomesSchema = new Schema({
  syllabusID: { type: Schema.Types.ObjectId, ref: "Syllabus", required: true },
  tlaID: { type: Schema.Types.ObjectId, ref: "TLA" },
  coNumber: String,
  mediatingOutcome: String,
  intendedLearningOutcomes: [String]
});

const COOutcomes = model("COOutcomes", coOutcomesSchema);
export default COOutcomes;