const express = require("express");
const router = express.Router();
const { pendingMentors , approveMentor , deleteUser , getAllMentors} = require("../controllers/adminDashbord");
const { getMenteesWithBookedSessions, getMenteesSessionDetails } = require('../controllers/adminDashbord');
const { auth, isAdmin } = require("../middlewares/authMiddleware");

// Route to get all pending mentors
router.get("/pending-mentors", auth, isAdmin, pendingMentors);
router.put("/approve-mentor/:id", auth, isAdmin, approveMentor);
router.delete("/delete-mentor/:id", auth, isAdmin, deleteUser);
router.get("/all-mentors", auth, isAdmin, getAllMentors);


// Protected admin route to get all mentees with booked sessions
router.get('/mentees-with-sessions', auth, isAdmin, getMenteesWithBookedSessions);

// Route to get all mentees with their session details
router.get('/mentees-session-details', auth, isAdmin, getMenteesSessionDetails);

module.exports = router;
