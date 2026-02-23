import { Schema, model } from "mongoose";

const syllabusSchema = new Schema({
  // Tying the syllabus to a specific User/Professor
  userID: { 
    type: Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  
  // Basic Course Info for the Overview Cards
  courseCode: { 
    type: String, 
    required: true 
  }, // e.g., "CPE101"
  courseTitle: { 
    type: String, 
    required: true 
  }, // e.g., "Digital Electronics"
  
  // ERD Fields for the "Access each Database using syllabusID" requirement
  term: String,
  schoolYear: String,
  units: Number,
  courseDescription: String,
  
  // Optional Fields for the deep-dive Syllabus page
  preRequisite: String,
  coRequisite: String,
  textbook: String,
  references: String,
  
  // Field for storing the generated or uploaded PDF
  pdf: Buffer

}, { timestamps: true });

// Note: MongoDB automatically creates an '_id' for this model.
// This '_id' will be your "syllabusID" mentioned in the ERD.
const Syllabus = model("Syllabus", syllabusSchema);

export default Syllabus;