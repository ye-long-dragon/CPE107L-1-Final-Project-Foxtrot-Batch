import { Schema, model } from "mongoose";

const userSchema = new Schema({
	address: { type: String },
	birthdate: { type: Date },
	gender: { type: String },

	password: {
		type: String,
		required: true
	},

	employmentFromOutside: {
		type: Boolean,
		default: false
	},

	employmentType: {
		type: String,
		enum: ["Full-Time", "Part-Time"]
	},

	employmentStatus: {
		type: String,
		enum: ["Yes", "No"],
		default: "No"
	},

	role: {
		type: String,
		enum: ["Professor", "Program-Chair", "Dean", "HR", "Admin", "Super-Admin"],
		default: "Professor"
	},

	phoneNumber: { type: String },

	program: {
		type: String,
		enum: ["CpE","ECE","EE","IE","CE","ChE","ME"]
	},

	department: {
		type: String,
		default: "CEA"
	},

	email: {
		type: String,
		required: true,
		unique: true
	},

	middleName: { type: String },
	firstName: { type: String, required: true },
	lastName: { type: String, required: true },

	employeeId: {
		type: String,
		unique: true
	}

	}, { timestamps: true });

const User = model("User", userSchema);
export default User;