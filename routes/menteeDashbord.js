const express = require("express");
const router = express.Router();
const { 
    bookMentorSession, 
    getUpcomingSessions,
    getCompletedSessions,
    getCancelledSessions,
    getMentorAvailability,
    getMeetingLink
} = require("../controllers/menteeDashbord");
const { auth, isMentee } = require("../middlewares/authMiddleware");

// Route to book a session with a mentor
router.post("/book-session", auth, isMentee, bookMentorSession);

// Route to get upcoming sessions for a mentee
router.get("/upcoming-sessions", auth, isMentee, getUpcomingSessions);

// Route to get completed sessions for a mentee
router.get("/completed-sessions", auth, isMentee, getCompletedSessions);

// Route to get cancelled sessions for a mentee
router.get("/cancelled-sessions", auth, isMentee, getCancelledSessions);

//for mentor availability
router.get("/mentor-availability/:mentorId", auth, isMentee, getMentorAvailability);

// Route to get meeting link for a specific session
router.get("/meeting-link/:sessionId", auth, getMeetingLink);

module.exports = router;
