const express = require("express");
const router = express.Router();
const { signup, login, sendOTP, adminLogin, logout, MentorData } = require("../controllers/authController");
const { auth, isMentee, isAdmin, isMentor } = require("../middlewares/authMiddleware");
const { mentorSignup, mentorLogin, getMentorImageUrl } = require("../controllers/mentoreController");


// Auth routes
router.post("/signup", signup);
router.post("/mentee-login", login);
router.post("/send-otp", sendOTP);
router.post("/admin-login", adminLogin);
router.get("/mentor-data", MentorData);

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

router.get("/test-mentor", auth, isMentor, (req, res) => {
    res.json({ success: true, message: "Mentor middleware working" });
});

// Mentor routes
router.post("/mentor-signup", mentorSignup);
router.post("/mentor-login", mentorLogin);
router.post("/mentor/mentor-image-url", getMentorImageUrl);

//for comon logout
router.post("/logout", logout); 

// Add this new route
router.get("/check-auth", auth, (req, res) => {
  try {
    // Return user info from the authenticated request
    return res.status(200).json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Authentication failed"
    });
  }
});

// Add this new route
router.get("/verify", auth, (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Authentication failed"
    });
  }
});



module.exports = router;