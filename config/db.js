const mongoose = require('mongoose');
const {createAdmin} = require('../utils/createAdmin')
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.DB_NAME
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
    await createAdmin();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
