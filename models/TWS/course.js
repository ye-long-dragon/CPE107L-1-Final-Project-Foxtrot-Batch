import { Schema, model } from "mongoose";

const courseSchema = new Schema({
  twsID: { type: Schema.Types.ObjectId, ref: "TWS", required: true },
  courseCode: String,
  section: String,
  isLecture: Boolean,
  lectureHours: String,
  labHours: String,
  units: Number,
  designatedRoom: String,
  time: String,
  day: String,
  department: String,
  description: String
});

const Course = model("Course", courseSchema);
export default Course;