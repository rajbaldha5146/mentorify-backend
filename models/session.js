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
    proposedDates: {
      type: [Date],
      required: true,
      validate: {
        validator: (dates) => dates.length > 0,
        message: "At least one date must be proposed",
      },
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Session", sessionSchema);
