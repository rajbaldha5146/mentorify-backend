const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    menteeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mentee",
      required: true,
    },
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mentor",
      required: true,
    },
    day: {
      type: String, // Example: "Monday"
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    timeSlot: {
      type: String, // Example: "10:00 AM - 11:00 AM"
      required: true,
    },
    message: { type: String }, // Optional message from the mentee
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
    review: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
      default: null
    }
  },
  { timestamps: true }
);

// Export the model only if it hasn't been compiled yet
module.exports = mongoose.models.Session || mongoose.model("Session", sessionSchema);
