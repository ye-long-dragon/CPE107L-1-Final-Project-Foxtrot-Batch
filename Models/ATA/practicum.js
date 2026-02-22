import { Schema, model } from "mongoose";

const practicumSchema = new Schema({
  ataID: { type: Schema.Types.ObjectId, ref: "ATA", required: true },
  code: [String],
  coordinator: [String],
  noOfStudents: [Number]
});

const Practicum = model("Practicum", practicumSchema);
export default Practicum;