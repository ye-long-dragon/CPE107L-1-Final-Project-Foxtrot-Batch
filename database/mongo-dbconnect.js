import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const baseURI = process.env.MONGO_URI;

const mainDB = mongoose.createConnection(baseURI, {
  dbName: "mainDB",
});

const backup1 = mongoose.createConnection(baseURI, {
  dbName: "backup1",
});

const backup2 = mongoose.createConnection(baseURI, {
  dbName: "backup2",
});

mainDB.once("open", () => console.log("✅ Connected to mainDB"));
backup1.once("open", () => console.log("✅ Connected to backup1"));
backup2.once("open", () => console.log("✅ Connected to backup2"));

const connectDB = async () => {
  console.log("Initializing MongoDB connections...");
};

export { mainDB, backup1, backup2 };
export default connectDB;