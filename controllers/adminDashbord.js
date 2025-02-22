// Import the Mentor model
const Mentor = require("../models/mentor");
const Session = require("../models/session");

// Function to get all pending mentors
exports.pendingMentors = async (req, res) => {
    try {
        // Step 1: Fetch all mentors where status is false
        const mentors = await Mentor.find({ status: false });

        // Step 2: If mentors are found, return them with a success response
        return res.status(200).json({
            success: true,
            data: mentors,
            message: "Pending mentors fetched successfully",
        });
    } catch (error) {
        // Step 3: Handle errors and return a server error response
        return res.status(500).json({
            success: false,
            message: "Error fetching pending mentors",
            error: error.message,
        });
    }
};

// Function to approve a mentor (update status to true)
exports.approveMentor = async (req, res) => {
    try {
        // Step 1: Extract Mentor ID from request parameters
        const mentorId = req.params.id;

        // Step 2: Find the mentor and update status to true
        const updatedMentor = await Mentor.findByIdAndUpdate(
            mentorId, 
            { status: true },  // Update status to true
            { new: true } // Return updated document
        );

        // Step 3: Handle case if mentor not found
        if (!updatedMentor) {
            return res.status(404).json({
                success: false,
                message: "Mentor not found",
            });
        }

        // Step 4: If successful, return updated mentor
        return res.status(200).json({
            success: true,
            data: updatedMentor,
            message: "Mentor approved successfully",
        });

    } catch (error) {
        // Step 5: Handle errors and return server error response
        return res.status(500).json({
            success: false,
            message: "Error updating mentor status",
            error: error.message,
        });
    }
};

// Function to delete a user 
exports.deleteUser = async (req, res) => {
    try {
        // Step 1: Extract user ID from request parameters
        const userId = req.params.id;

        // Step 2: 
        const deletedUser = await Mentor.findById(userId);

        if(!deletedUser.status){
            return res.status(400).json({
                success: false,
                message: "Mentor is not approved",
            });
        }

        //Step 3:if status is true than delet
        const deletedMentor = await Mentor.findByIdAndDelete(userId);

        // Step 4: Handle case if user not found
        if (!deletedMentor) {
            return res.status(404).json({
                success: false,
                message: "Mentor not found",
            });
        }

        // Step 4: If deleted successfully, return success response
        return res.status(200).json({
            success: true,
            message: "Mentor deleted successfully",
        });

    } catch (error) {
        // Step 5: Handle errors and return server error response
        return res.status(500).json({
            success: false,
            message: "Error deleting mentor",
            error: error.message,
        });
    }
};

// Function to fetch all approved mentors
exports.getAllMentors = async (req, res) => {
    try {
        // Step 1: Fetch all mentors with status = true
        const mentors = await Mentor.find({status: true });

        // Step 2: Return response with mentor data
        return res.status(200).json({
            success: true,
            mentors: mentors,
        });

    } catch (error) {
        // Step 3: Handle errors and return server error response
        return res.status(500).json({
            success: false,
            message: "Error fetching mentors",
            error: error.message,
        });
    }
};

// Get all mentees who have booked sessions
exports.getMenteesWithBookedSessions = async (req, res) => {
    try {
        // Find all sessions and populate mentee details
        const bookedSessions = await Session.find({})
            .populate('menteeId', 'name email phone') 
            .populate('mentorId', 'name')
            .select('menteeId mentorId date timeSlot status');

        // Filter out sessions where menteeId is null
        const validSessions = bookedSessions.filter(session => session.menteeId);

        // Group sessions by mentee for better organization
        const menteeSessionMap = validSessions.reduce((acc, session) => {
            const menteeId = session.menteeId._id.toString();

            if (!acc[menteeId]) {
                acc[menteeId] = {
                    menteeDetails: {
                        id: session.menteeId._id,
                        name: session.menteeId.name,
                        email: session.menteeId.email,
                        phone: session.menteeId.phone
                    },
                    sessions: []
                };
            }

            acc[menteeId].sessions.push({
                mentor: session.mentorId ? session.mentorId.name : 'Unknown',
                date: session.date,
                timeSlot: session.timeSlot,
                status: session.status
            });

            return acc;
        }, {});

        // Convert the map to array for response
        const menteesWithSessions = Object.values(menteeSessionMap);

        res.status(200).json({
            success: true,
            data: menteesWithSessions,
            message: "Successfully fetched mentees with booked sessions"
        });

    } catch (error) {
        console.error('Error in getMenteesWithBookedSessions:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching mentees with booked sessions',
            error: error.message
        });
    }
};

// Function to get all mentees with their session details
exports.getMenteesSessionDetails = async (req, res) => {
    try {
        // Step 1: Find all sessions and populate necessary details
        const allSessions = await Session.find({})
            .populate('menteeId', 'name email phone')
            .populate('mentorId', 'name email')
            .select('menteeId mentorId date timeSlot status day message')
            .sort({ date: -1 });

        // Step 2: Filter out sessions with null menteeId
        const validSessions = allSessions.filter(session => session.menteeId);

        // Step 3: If no valid sessions found, return empty response
        if (!validSessions || validSessions.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No sessions found",
                data: []
            });
        }

        // Step 4: Group sessions by mentee
        const menteeSessionMap = validSessions.reduce((acc, session) => {
            if (!session.menteeId) return acc;

            const menteeId = session.menteeId._id.toString();

            // Initialize mentee entry if it doesn't exist
            if (!acc[menteeId]) {
                acc[menteeId] = {
                    menteeDetails: {
                        id: session.menteeId._id,
                        name: session.menteeId.name || 'Unknown',
                        email: session.menteeId.email || 'No email',
                        phone: session.menteeId.phone || 'No phone'
                    },
                    sessions: {
                        upcoming: [],
                        completed: [],
                        cancelled: []
                    }
                };
            }

            // Create formatted session object with null checks
            const formattedSession = {
                sessionId: session._id,
                mentor: session.mentorId ? {
                    id: session.mentorId._id,
                    name: session.mentorId.name || 'Unknown',
                    email: session.mentorId.email || 'No email'
                } : { id: null, name: 'Unknown', email: 'No email' },
                date: session.date,
                day: session.day || '',
                timeSlot: session.timeSlot || '',
                status: session.status || 'unknown',
                message: session.message || ''
            };

            // Categorize session based on status
            switch (session.status) {
                case 'pending':
                case 'confirmed':
                    acc[menteeId].sessions.upcoming.push(formattedSession);
                    break;
                case 'completed':
                    acc[menteeId].sessions.completed.push(formattedSession);
                    break;
                case 'cancelled':
                    acc[menteeId].sessions.cancelled.push(formattedSession);
                    break;
                default:
                    console.warn(`Unknown session status: ${session.status}`);
            }

            return acc;
        }, {});

        // Step 5: Convert the map to array and add session counts
        const formattedResponse = Object.values(menteeSessionMap).map(mentee => ({
            menteeDetails: mentee.menteeDetails,
            sessions: mentee.sessions,
            sessionCounts: {
                upcoming: mentee.sessions.upcoming.length,
                completed: mentee.sessions.completed.length,
                cancelled: mentee.sessions.cancelled.length,
                total: mentee.sessions.upcoming.length + 
                       mentee.sessions.completed.length + 
                       mentee.sessions.cancelled.length
            }
        }));

        // Step 6: Return success response with formatted data
        return res.status(200).json({
            success: true,
            message: "Mentee session details retrieved successfully",
            data: formattedResponse
        });

    } catch (error) {
        console.error("Error in getMenteesSessionDetails:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching mentee session details",
            error: error.message
        });
    }
};

