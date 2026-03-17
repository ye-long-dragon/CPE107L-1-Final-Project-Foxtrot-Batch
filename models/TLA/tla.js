import { Schema, model } from "mongoose";

const tlaSchema = new Schema({
  courseCode: String,
  syllabusID: { type: Schema.Types.ObjectId, ref: "Syllabus" },
  userID: { type: Schema.Types.ObjectId, ref: "User", required: true },
  section: String,
  dateofDigitalDay: String,
  facultyFacilitating: String,
  courseOutcomes: String,
  mediatingOutcomes: String,
  status: {
    type: String,
    enum: [
      "Draft",
      "Pending",
      "Tech-Approved",
      "Chair-Approved",
      "Practicum-Approved",
      "Dean-Approved",
      "VPAA-Noted",
      "Approved",
      "Returned",
      "Archived"
    ],
    default: "Draft"
  },
  weekNumber: Number,
  pdf: Buffer
},{ timestamps:true });

const TLA = model("TLA", tlaSchema);
export { tlaSchema };
export default TLA;