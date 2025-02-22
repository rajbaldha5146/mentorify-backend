const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const mentorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    password: { type: String, required: true, minlength: 6 },
    profilePicture: { type: String },
    experience: { type: String, required: true },
    currentPosition: { type: String, required: true },
    status: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      default: "mentor"
    },
    reviews: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review"
    }],
    rating: {
      average: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
      fiveStars: { type: Number, default: 0 },
      fourStars: { type: Number, default: 0 },
      threeStars: { type: Number, default: 0 },
      twoStars: { type: Number, default: 0 },
      oneStars: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Mentor", mentorSchema);
