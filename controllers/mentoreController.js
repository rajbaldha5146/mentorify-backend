const OTP = require("../models/OTP");
const Mentor = require("../models/mentor");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Helper function to validate email format
const isValidEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

//signup controller
exports.mentorSignup = async (req, res) => {
    try {
      // STEP 1: Fetch and validate input data
      const { name, email, password, confirmPassword, otp, experience, currentPosition } = req.body;
  
      // Input validation
      if (!name || !email || !password || !confirmPassword || !otp || !experience || !currentPosition) {
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
      const existingUser = await Mentor.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Mentor already registered",
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
      
      const user = await Mentor.create({
        name,
        email,
        password: hashedPassword,
        experience,
        currentPosition,
        status: false, // Default status
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
exports.mentorLogin = async (req, res) => {
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
      let user = await Mentor.findOne({ email });
      // console.log(user);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Mentor not registered",
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
      const payload = { id: user._id, email: user.email, role: user.role }; 
      //jwt.sign() takes 3 arguments: payload, secret, options
      const token = jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );
  
      // console.log(typeof user);
      user = user.toObject(); 
      //i want to add a new field to the user object called token and assign it the value of the token variable
      user.token = token;
      // console.log(user);
      user.password = undefined;
      // console.log(user);
  
      // STEP 6: Set cookie and send response
      //cookie is a small text file stored on the user's computer by the web browser
      //cookie needs three parameters: name, data, options
      res.cookie("token", token, {
        httpOnly: true,
        // secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
  
      return res.status(200).json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          experience: user.experience,
          currentPosition: user.currentPosition,
          status: user.status,
          token: token
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