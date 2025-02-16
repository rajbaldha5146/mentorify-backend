const express = require("express");
const router = express.Router();
const { signup, login, sendOTP } = require("../controllers/authController");

// Auth routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/send-otp", sendOTP);

module.exports = router;