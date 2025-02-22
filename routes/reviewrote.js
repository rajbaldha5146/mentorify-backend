const express = require('express');
const router = express.Router();
const { submitReview, getMentorReviews, getMenteeReviews } = require('../controllers/reviewController');
const { auth, isMentee } = require('../middlewares/authMiddleware');

// Route to submit a review (protected, mentee only)
router.post('/submit', auth, isMentee, submitReview);

// Route to get mentor reviews (public)
router.get('/mentor/:mentorId', getMentorReviews);

// Route to get mentee reviews (protected, mentee only)
router.get('/:menteeId/:sessionId', auth, isMentee, getMenteeReviews);

module.exports = router;
