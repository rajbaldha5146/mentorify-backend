const Review = require('../models/review');
const Session = require('../models/session');
const Mentor = require('../models/mentor');

// Submit a review for a completed session
const submitReview = async (req, res) => {
    try {
        // Step 1: Extract data from request
        const menteeId = req.user.id; // From auth middleware
        const { sessionId, mentorId, rating, comment } = req.body;

        // Step 2: Validate required fields
        if (!sessionId || !mentorId || !rating || !comment) {
            return res.status(400).json({
                success: false,
                message: "All fields are required: sessionId, mentorId, rating, and comment"
            });
        }

        // Step 3: Validate rating range
        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 5"
            });
        }

        // Step 4: Verify session exists and is completed
        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Session not found"
            });
        }

        // Step 5: Verify session belongs to the mentee
        if (session.menteeId.toString() !== menteeId) {
            return res.status(403).json({
                success: false,
                message: "You can only review sessions you attended"
            });
        }

        // Step 6: Verify session is completed
        if (session.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: "You can only review completed sessions"
            });
        }

        // Step 7: Check if review already exists
        const existingReview = await Review.findOne({ sessionId });
        if (existingReview) {
            return res.status(400).json({
                success: false,
                message: "You have already submitted a review for this session"
            });
        }

        // Step 8: Create and save the review
        const review = await Review.create({
            sessionId,
            menteeId,
            mentorId,
            rating,
            comment
        });

        // Update session with review reference
        await Session.findByIdAndUpdate(sessionId, {
            review: review._id
        });

        // Update mentor's reviews and rating statistics
        const mentor = await Mentor.findById(mentorId);
        
        // Add review to mentor's reviews array
        mentor.reviews.push(review._id);
        
        // Update rating statistics
        mentor.rating.totalReviews += 1;
        
        // Update star counts
        switch (rating) {
            case 5: mentor.rating.fiveStars += 1; break;
            case 4: mentor.rating.fourStars += 1; break;
            case 3: mentor.rating.threeStars += 1; break;
            case 2: mentor.rating.twoStars += 1; break;
            case 1: mentor.rating.oneStars += 1; break;
        }

        // Calculate new average rating
        mentor.rating.average = (
            (mentor.rating.fiveStars * 5) +
            (mentor.rating.fourStars * 4) +
            (mentor.rating.threeStars * 3) +
            (mentor.rating.twoStars * 2) +
            (mentor.rating.oneStars * 1)
        ) / mentor.rating.totalReviews;

        // Save mentor updates
        await mentor.save();

        // Step 9: Return success response
        return res.status(201).json({
            success: true,
            message: "Review submitted successfully",
            data: {
                reviewId: review._id,
                sessionId: review.sessionId,
                rating: review.rating,
                comment: review.comment,
                createdAt: review.createdAt
            }
        });

    } catch (error) {
        console.error("Error submitting review:", error);
        return res.status(500).json({
            success: false,
            message: "Error submitting review",
            error: error.message
        });
    }
};

// Get reviews for a specific mentor
const getMentorReviews = async (req, res) => {
    try {
        const { mentorId } = req.params;

        // Find all reviews for the mentor
        const reviews = await Review.find({ mentorId })
            .populate('menteeId', 'name')
            .populate('sessionId', 'date timeSlot')
            .sort({ createdAt: -1 });

        // Calculate average rating
        const averageRating = reviews.length > 0
            ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
            : 0;

        return res.status(200).json({
            success: true,
            data: {
                averageRating,
                totalReviews: reviews.length,
                reviews: reviews.map(review => ({
                    reviewId: review._id,
                    mentee: review.menteeId.name,
                    rating: review.rating,
                    comment: review.comment,
                    sessionDate: review.sessionId.date,
                    timeSlot: review.sessionId.timeSlot,
                    createdAt: review.createdAt
                }))
            }
        });

    } catch (error) {
        console.error("Error fetching mentor reviews:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching mentor reviews",
            error: error.message
        });
    }
};

// Get all reviews for a specific mentee with specfic sessionId
const getMenteeReviews = async (req, res) => {
    try {
        const { menteeId, sessionId } = req.params;

        // Find all reviews for the mentee and session  
        const reviews = await Review.find({ menteeId, sessionId })
            .populate('mentorId', 'name')
            .populate('sessionId', 'date timeSlot')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: {
                reviews
            }
        });
    } catch (error) {
        console.error("Error fetching mentee reviews:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching mentee reviews",
            error: error.message
        });
    }
};

module.exports = {
    submitReview,
    getMentorReviews,
    getMenteeReviews
};
