"use strict";

const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI?.trim();

  if (!mongoUri) {
    const error = new Error(
      "MONGO_URI is missing from environment variables"
    );

    error.code = "MONGO_URI_MISSING";
    throw error;
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    maxPoolSize: 20,
    minPoolSize: 0,
  });

  console.log("MongoDB connected successfully");

  return mongoose.connection;
};

module.exports = connectDB;