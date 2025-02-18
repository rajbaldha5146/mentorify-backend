const express = require("express");
const router = express.Router();
const { pendingMentors , approveMentor , deleteUser , getAllMentors} = require("../controllers/adminController");
const { auth, isAdmin } = require("../middlewares/authMiddleware");

// Route to get all pending mentors
router.get("/pending-mentors", auth, isAdmin, pendingMentors);
router.put("/approve-mentor/:id", auth, isAdmin, approveMentor);
router.delete("/delete-mentor/:id", auth, isAdmin, deleteUser);
router.get("/all-mentors", auth, isAdmin, getAllMentors);


module.exports = router;
