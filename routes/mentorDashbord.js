const express = require("express");
const router = express.Router();
const { 
    setMentorAvailability,
    getMentorAvailability,
    getPendingSessionRequests,
    acceptSessionRequest,
    deleteSessionRequest,
    manualUpdateCompletedSessions,
    getUpcomingAcceptedSessions,
    getCompletedSessions,
    getCancelledSessions,
    updateMentorAvailability,
    updateMentorProfile,
    getMentorDetails,
    uploadProfilePicture,
    getMentorImageUrl
} = require("../controllers/mentorDashbord");
const { auth, isMentor } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/multer");

// Route to set/update mentor availability
router.post("/set-availability", auth, isMentor, setMentorAvailability);

// Route to get mentor availability
router.get("/availability", auth, isMentor , getMentorAvailability);

// Route to get pending session requests
router.get("/pending-requests", auth, isMentor, getPendingSessionRequests);

// Route to accept a session request
router.post("/accept-session", auth, isMentor, acceptSessionRequest);

// Route to delete a pending session request
router.delete("/delete-session/:sessionId", auth, isMentor, deleteSessionRequest);

// Route to get upcoming accepted sessions
router.get("/upcoming-accepted-sessions", auth, isMentor, getUpcomingAcceptedSessions);

// Route to get completed sessions
router.get("/completed-sessions", auth, isMentor, getCompletedSessions);

// Route to get cancelled sessions
router.get("/cancelled-sessions", auth, isMentor, getCancelledSessions);

// Route to manually trigger session completion updates
router.post("/update-completed-sessions", auth, isMentor, manualUpdateCompletedSessions);

// Route to update mentor availability
router.put("/update-availability", auth, isMentor, updateMentorAvailability);

// Route to get mentor details
router.get("/mentor-details/:id", auth, isMentor, getMentorDetails);

// Route to update mentor profile
router.put("/update-profile/:id", auth, isMentor, updateMentorProfile);

// Route for uploading profile picture
router.post(
    "/upload-profile-picture",
    auth,
    isMentor,
    upload.single('profilePicture'),
    uploadProfilePicture
);

// Route to get mentor image URL
router.get("/mentor-image-url", auth, isMentor, getMentorImageUrl);

module.exports = router;
