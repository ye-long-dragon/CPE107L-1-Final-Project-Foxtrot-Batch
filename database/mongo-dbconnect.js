import mongoose from "mongoose";

let mainDB;
let backup1;
let backup2;

const connectDB = async () => {
  try {
    const baseURI = process.env.MONGO_URI;

    mainDB = mongoose.createConnection(baseURI, {
      dbName: "mainDB",
    });

    backup1 = mongoose.createConnection(baseURI, {
      dbName: "backup1",
    });

    backup2 = mongoose.createConnection(baseURI, {
      dbName: "backup2",
    });

    mainDB.once("open", () =>
      console.log("✅ Connected to mainDB")
    );

    backup1.once("open", () =>
      console.log("✅ Connected to backup1")
    );

    backup2.once("open", () =>
      console.log("✅ Connected to backup2")
    );

  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

export { mainDB, backup1, backup2 };
export default connectDB;