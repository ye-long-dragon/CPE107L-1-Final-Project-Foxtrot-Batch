import { Schema, model } from "mongoose";

const syllabusSchema = new Schema({
  userID: {
    type: Schema.Types.ObjectId,
    ref: "User", // Correctly references the User model you provided
    required: true
  },
  courseCode: {
    type: String,
    required: true // e.g., "CPE107L"
  },
  courseTitle: {
    type: String,
    required: true // e.g., "Software Design"
  },
  assignedInstructor: {
    type: Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  courseImage: {
    type: String,
    default: null // Stores the file path of the uploaded image
  }
}, { timestamps: true });

// The MongoDB _id serves as the "syllabusID" for the ERD
const Syllabus = model("Syllabus", syllabusSchema);
export default Syllabus;