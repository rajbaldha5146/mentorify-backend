const express = require("express");
const router = express.Router();
const { signup, login, sendOTP, adminLogin } = require("../controllers/authController");
const { auth, isMentee, isAdmin } = require("../middlewares/authMiddleware");
const { mentorSignup, mentorLogin } = require("../controllers/mentoreController");

// Auth routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/send-otp", sendOTP);
router.post("/admin-login", adminLogin);

// Test routes for middleware
router.get("/test-auth", auth, (req, res) => {
    res.json({ success: true, message: "Auth middleware working" });
});

router.get("/test-mentee", auth, isMentee, (req, res) => {
    res.json({ success: true, message: "Mentee middleware working" });
});

router.get("/test-admin", auth, isAdmin, (req, res) => {
    res.json({ success: true, message: "Admin middleware working" });
});


// Mentor routes
router.post("/mentor-signup", mentorSignup);
router.post("/mentor-login", mentorLogin);

module.exports = router;