const MentorAvailability = require("../models/mentorAvailability");
const Session = require("../models/session"); // Assuming you have a Session model
const nodemailer = require("nodemailer");
const Mentor = require("../models/mentor"); // Add this if not already imported
const Mentee = require("../models/mentee"); // Add this if not already imported

// Book a mentor session
const bookMentorSession = async (req, res) => {
    try {
        const { mentorId, day, date, timeSlot, message } = req.body;
        const menteeId = req.user.id;

        // Add check for existing confirmed session
        const existingConfirmedSession = await Session.findOne({
            menteeId,
            status: 'confirmed'
        });

        if (existingConfirmedSession) {
            return res.status(400).json({ 
                success: false, 
                message: "Please complete your existing confirmed session before booking a new one" 
            });
        }

        if (!mentorId || !day || !date || !timeSlot) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const sessionDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (isNaN(sessionDate) || sessionDate < today) {
            return res.status(400).json({ success: false, message: "Invalid or past date" });
        }

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dateDay = days[sessionDate.getDay()];
        
        if (dateDay !== day) {
            return res.status(400).json({ success: false, message: `Selected date (${date}) is not a ${day}` });
        }

        const mentorAvailability = await MentorAvailability.findOne({ mentorId });

        if (!mentorAvailability) {
            return res.status(404).json({ success: false, message: "Mentor availability not found" });
        }

        if (!mentorAvailability.availableDays.includes(day)) {
            return res.status(400).json({ success: false, message: "Mentor is not available on this day" });
        }

        const daySlots = mentorAvailability.slotsPerDay.find(slot => slot.day === day);
        if (!daySlots) {
            return res.status(400).json({ success: false, message: "No slots available for this day" });
        }

        // Find requested slot
        const requestedSlot = daySlots.slots.find(
            slot => `${slot.startTime} - ${slot.endTime}` === timeSlot
        );

        if (!requestedSlot) {
            return res.status(400).json({ success: false, message: "Invalid time slot" });
        }

        // Check if the slot is already booked for this date
        if (requestedSlot.bookedDates.includes(date)) {
            return res.status(400).json({ success: false, message: "This time slot is already booked for the selected date" });
        }

        // Create new session
        const session = await Session.create({
            mentorId,
            menteeId,
            day,
            date: sessionDate,
            timeSlot,
            message: message || "",
            status: "pending"
        });

        // Mark this slot as booked for this specific date
        requestedSlot.bookedDates.push(date);
        await mentorAvailability.save();

        return res.status(201).json({ success: true, message: "Session booked successfully", session });

    } catch (error) {
        console.error("Error booking session:", error);
        return res.status(500).json({ success: false, message: "Error booking session", error: error.message });
    }
};


// Get upcoming sessions for a mentee
const getUpcomingSessions = async (req, res) => {
    try {
        const menteeId = req.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of day

        // Fetch all sessions for the mentee that are pending or confirmed
        const upcomingSessions = await Session.find({
            menteeId: menteeId,
            status: { $in: ['pending', 'confirmed'] },
            date: { $gte: today } // Only get sessions from today onwards
        })
        .populate('mentorId', 'name email profilePicture currentPosition')
        .sort({ 'date': 1, 'timeSlot': 1 }) // Sort by date and time
        .exec();

        // If no sessions found
        if (!upcomingSessions || upcomingSessions.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No upcoming sessions found",
                sessions: []
            });
        }

        // Format the sessions for response
        const formattedSessions = upcomingSessions.map(session => ({
            sessionId: session._id,
            mentor: session.mentorId ? {
                id: session.mentorId._id,
                name: session.mentorId.name,
                email: session.mentorId.email,
                profilePicture: session.mentorId.profilePicture,
                currentPosition: session.mentorId.currentPosition
            } : {
                id: null,
                name: 'Mentor not found',
                email: '',
                profilePicture: '',
                currentPosition: ''
            },
            day: session.day,
            date: session.date,
            timeSlot: session.timeSlot,
            message: session.message,
            status: session.status,
            createdAt: session.createdAt
        }));

        // Return success response with sessions
        return res.status(200).json({
            success: true,
            message: "Upcoming sessions retrieved successfully",
            sessions: formattedSessions
        });

    } catch (error) {
        console.error("Error fetching upcoming sessions:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching upcoming sessions",
            error: error.message
        });
    }
};

// Get completed sessions for a mentee
const getCompletedSessions = async (req, res) => {
    try {
        const menteeId = req.user.id;

        // Fetch all completed sessions for the mentee
        const completedSessions = await Session.find({
            menteeId: menteeId,
            status: 'completed'
        })
        .populate('mentorId', 'name email profilePicture currentPosition')
        .sort({ 'date': -1, 'timeSlot': 1 }) // Sort by date (descending) and time
        .exec();

        // If no completed sessions found
        if (!completedSessions || completedSessions.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No completed sessions found",
                sessions: []
            });
        }

        // Format the sessions for response
        const formattedSessions = completedSessions.map(session => ({
            sessionId: session._id,
            mentor: session.mentorId ? {
                id: session.mentorId._id,
                name: session.mentorId.name,
                email: session.mentorId.email,
                profilePicture: session.mentorId.profilePicture,
                currentPosition: session.mentorId.currentPosition
            } : {
                id: null,
                name: 'Mentor not found',
                email: '',
                profilePicture: '',
                currentPosition: ''
            },
            day: session.day,
            date: session.date,
            timeSlot: session.timeSlot,
            message: session.message || '',
            status: session.status,
            completedAt: session.updatedAt
        }));

        // Return success response with sessions
        return res.status(200).json({
            success: true,
            message: "Completed sessions retrieved successfully",
            sessions: formattedSessions
        });

    } catch (error) {
        console.error("Error fetching completed sessions:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching completed sessions",
            error: error.message
        });
    }
};

// Get cancelled sessions for a mentee
const getCancelledSessions = async (req, res) => {
    try {
        const menteeId = req.user.id;

        // Fetch all cancelled sessions for the mentee
        const cancelledSessions = await Session.find({
            menteeId: menteeId,
            status: 'cancelled'
        })
        .populate('mentorId', 'name email profilePicture currentPosition')
        .sort({ 'date': -1, 'timeSlot': 1 }) // Sort by date (descending) and time
        .exec();

        // If no cancelled sessions found
        if (!cancelledSessions || cancelledSessions.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No cancelled sessions found",
                sessions: []
            });
        }

        // Format the sessions for response
        const formattedSessions = cancelledSessions.map(session => ({
            sessionId: session._id,
            mentor: session.mentorId ? {
                id: session.mentorId._id,
                name: session.mentorId.name,
                email: session.mentorId.email,
                profilePicture: session.mentorId.profilePicture,
                currentPosition: session.mentorId.currentPosition
            } : {
                id: null,
                name: 'Mentor not found',
                email: '',
                profilePicture: '',
                currentPosition: ''
            },
            day: session.day,
            date: session.date,
            timeSlot: session.timeSlot,
            message: session.message || '',
            status: session.status,
            cancelledAt: session.updatedAt
        }));

        // Return success response with sessions
        return res.status(200).json({
            success: true,
            message: "Cancelled sessions retrieved successfully",
            sessions: formattedSessions
        });

    } catch (error) {
        console.error("Error fetching cancelled sessions:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching cancelled sessions",
            error: error.message
        });
    }
};

// Get mentor availability for a mentee
const getMentorAvailability = async (req, res) => {
    try {
      
        //fatch mentor id from req.params
        const mentorId = req.params.mentorId;

        //find mentor availability
        const mentorAvailability = await MentorAvailability.findOne({ mentorId });

        return res.status(200).json({ mentorAvailability });
    } catch (error) {
        console.error("Error fetching mentor availability:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching mentor availability",
            error: error.message
        });
    }
};

// Get meeting link for a specific session
const getMeetingLink = async (req, res) => {
    try {
        const menteeId = req.user.id;
        const { sessionId } = req.params;

        // Find the session and ensure it belongs to this mentee
        const session = await Session.findOne({
            _id: sessionId,
            menteeId: menteeId,
            status: 'confirmed'
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Confirmed session not found"
            });
        }

        // Check if meeting link exists
        if (!session.meetingLink) {
            return res.status(404).json({
                success: false,
                message: "Meeting link has not been added yet"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Meeting link retrieved successfully",
            data: {
                sessionId: session._id,
                meetingLink: session.meetingLink,
                timeSlot: session.timeSlot,
                date: session.date,
                day: session.day
            }
        });

    } catch (error) {
        console.error("Error fetching meeting link:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching meeting link",
            error: error.message
        });
    }
};

module.exports = {
    bookMentorSession,
    getUpcomingSessions,
    getCompletedSessions,
    getCancelledSessions,
    getMentorAvailability,
    getMeetingLink,
};
