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
      "Draft",              // Faculty working on it
      "Pending",            // Submitted, awaiting Program-Chair
      "Chair-Approved",     // Program Chair endorsed, awaiting Dean
      "Dean-Approved",      // Dean approved, awaiting HR/HRMO
      "HR-Approved",        // HR/HRMO approved, awaiting VPAA
      "Approved",           // VPAA final approval — fully complete
      "Returned",           // Rejected at any stage, back to Professor
      "Archived"            // Legacy / admin-archived
    ],
    default: "Draft"
  },
  weekNumber: Number,
  pdf: Buffer
},{ timestamps:true });

const TLA = model("TLA", tlaSchema);
export { tlaSchema };
export default TLA;