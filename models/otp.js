const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email is required"],
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Invalid email"],
    unique: true, // Ensure unique email for OTP
  },
  otp: {
    type: String,
    required: [true, "OTP is required"],
    minlength: [6, "OTP must be 6 characters long"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // Auto-delete after 5 minutes
  },
});

// Send OTP email on creation
otpSchema.pre('save', async function (next) {
  if (this.isNew) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Mentorify" <${process.env.NODEMAILER_USER}>`,
      to: this.email,
      subject: "Your OTP Code",
      text: `Your OTP is ${this.otp} (valid for 5 minutes)`,
    });
  }
  next();
});

module.exports = mongoose.model('OTP', otpSchema);