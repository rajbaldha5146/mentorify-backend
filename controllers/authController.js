// controllers/authController.js
const bcrypt = require("bcryptjs");
const mentee = require("../models/mentee");
const OTP = require("../models/OTP");
const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const mailSender = require("../utils/mailSender");
require("dotenv").config();

// Helper function to validate email format
const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// SIGNUP CONTROLLER
exports.signup = async (req, res) => {
  try {
    // STEP 1: Fetch and validate input data
    const { name, email, password, confirmPassword, otp } = req.body;

    // Input validation
    if (!name || !email || !password || !confirmPassword || !otp) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // STEP 2: Check password match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password and confirm password do not match",
      });
    }

    // STEP 3: Check existing user
    const existingUser = await mentee.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already registered",
      });
    }

    // STEP 4: Verify OTP
    const recentOTP = await OTP.findOne({ email })
      .sort({ createdAt: -1 })
      .limit(1);

    if (!recentOTP || recentOTP.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // STEP 5: Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 12);
    // console.log(hashedPassword);
    
    const user = await mentee.create({
      name,
      email,
      password: hashedPassword,
      role: "mentee", // Default role
    });

    // console.log(user);
    // console.log(user.password);

    // STEP 6: Clean sensitive data before response
    user.password = undefined;

    return res.status(201).json({
      success: true,
      user,
      message: "User registration successful",
    });

  } catch (error) {
    console.error("Signup Error:", error);
    return res.status(500).json({
      success: false,
      message: "Registration failed. Please try again.",
    });
  }
};

// LOGIN CONTROLLER
exports.login = async (req, res) => {
  try {
    // STEP 1: Get credentials
    const { email, password } = req.body;

    // STEP 2: Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // STEP 3: Find user
    const user = await mentee.findOne({ email });
    // console.log(user);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not registered",
      });
    }

    // STEP 4: Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password",
      });
    }

    // STEP 5: Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // STEP 6: Set cookie and send response
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      message: "Login successful",
    });

  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
    });
  }
};

// SEND OTP CONTROLLER
exports.sendOTP = async (req, res) => {
  try {
    // STEP 1: Get email from request
    const { email } = req.body;

    // STEP 2: Validate email format
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Valid email is required",
      });
    }

    // STEP 3: Check existing user
    const existingUser = await mentee.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already registered",
      });
    }

    // STEP 4: Generate unique OTP
    let otp;
    do {
      otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
      });
    } while (await OTP.findOne({ otp }));

    // STEP 5: Save OTP to database
    const otpEntry = await OTP.create({ email, otp });

    // STEP 6: Send response (OTP sent via email through pre-save hook)
    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      otpId: otpEntry._id,
    });

  } catch (error) {
    console.error("OTP Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};