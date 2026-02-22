import { Schema, model } from "mongoose";

const tlaSchema = new Schema({
  courseCode: String,
  userID: { type: Schema.Types.ObjectId, ref: "User", required: true },
  section: String,
  dateofDigitalDay: String,
  pdf: Buffer
},{ timestamps:true });

const TLA = model("TLA", tlaSchema);
export default TLA;