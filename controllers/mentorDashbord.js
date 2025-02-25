const MentorAvailability = require("../models/mentorAvailability");
const Session = require("../models/session");
const mongoose = require('mongoose');
const cron = require('node-cron');
const Mentor = require("../models/mentor");
const nodemailer = require('nodemailer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper function to validate time format (HH:MM AM/PM)
const isValidTimeFormat = (time) => {
    const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
    return timeRegex.test(time);
};

// Helper function to validate day
const isValidDay = (day) => {
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return validDays.includes(day);
};

// Set or update mentor availability
const setMentorAvailability = async (req, res) => {
    try {
        const mentorId = req.user.id; // Get mentor ID from authenticated user
        const { availableDays, slotsPerDay } = req.body;

        // Validate availableDays
        if (!Array.isArray(availableDays) || availableDays.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Available days must be a non-empty array"
            });
        }

        // Validate each day
        if (!availableDays.every(day => isValidDay(day))) {
            return res.status(400).json({
                success: false,
                message: "Invalid day provided. Days must be Monday through Sunday"
            });
        }

        // Validate slotsPerDay
        if (!Array.isArray(slotsPerDay) || slotsPerDay.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Slots per day must be a non-empty array"
            });
        }

        // Validate each slot
        for (const daySlot of slotsPerDay) {
            if (!isValidDay(daySlot.day)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid day: ${daySlot.day}`
                });
            }

            if (!Array.isArray(daySlot.slots) || daySlot.slots.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: `No time slots provided for ${daySlot.day}`
                });
            }

            for (const slot of daySlot.slots) {
                if (!isValidTimeFormat(slot.startTime) || !isValidTimeFormat(slot.endTime)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid time format. Use HH:MM AM/PM format"
                    });
                }
            }
        }

        // Check if mentor availability already exists
        let mentorAvailability = await MentorAvailability.findOne({ mentorId });

        if (mentorAvailability) {
            return res.status(400).json({
                success: false,
                message: "You have already added availability. Update it instead."
            });
        }

        // Create new availability entry
        mentorAvailability = await MentorAvailability.create({
            mentorId,
            availableDays,
            slotsPerDay
        });

        return res.status(201).json({
            success: true,
            message: "Availability set successfully",
            availability: mentorAvailability
        });

    } catch (error) {
        console.error("Error setting mentor availability:", error);
        return res.status(500).json({
            success: false,
            message: "Error setting availability",
            error: error.message
        });
    }
};


// Get mentor availability
const getMentorAvailability = async (req, res) => {
    try {
        const mentorId = req.user.id;

        const availability = await MentorAvailability.findOne({ mentorId });

        if (!availability) {
            return res.status(404).json({
                success: false,
                message: "No availability settings found"
            });
        }

        return res.status(200).json({
            success: true,
            availability
        });

    } catch (error) {
        console.error("Error fetching mentor availability:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching availability",
            error: error.message
        });
    }
};

// Get pending session requests for a mentor
const getPendingSessionRequests = async (req, res) => {
    try {
        const mentorId = req.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of day

        // Fetch all pending sessions for the mentor
        const pendingRequests = await Session.find({
            mentorId: mentorId,
            status: 'pending',
            date: { $gte: today } // Only get sessions from today onwards
        })
        .populate('menteeId', 'name email')
        .sort({ 'date': 1, 'timeSlot': 1 }) // Sort by date and time
        .exec();

        // If no pending requests found
        if (!pendingRequests || pendingRequests.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No pending session requests found",
                requests: []
            });
        }

        // Format the response data
        const formattedRequests = pendingRequests.map(request => ({
            sessionId: request._id,
            mentee: {
                id: request.menteeId._id,
                name: request.menteeId.name,
                email: request.menteeId.email
            },
            day: request.day,
            date: request.date,
            timeSlot: request.timeSlot,
            message: request.message,
            requestedAt: request.createdAt
        }));

        // Return success response with formatted requests
        return res.status(200).json({
            success: true,
            message: "Pending session requests retrieved successfully",
            requests: formattedRequests
        });

    } catch (error) {
        console.error("Error fetching pending session requests:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching pending session requests",
            error: error.message
        });
    }
};

// Accept a pending session request
const acceptSessionRequest = async (req, res) => {
    try {
        const { sessionId } = req.body;

        // Find and update the session status
        const session = await Session.findByIdAndUpdate(
            sessionId,
            { status: 'confirmed' },
            { new: true }
        ).populate('menteeId mentorId');

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Session not found"
            });
        }

        // Create email transporter
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.NODEMAILER_USER,
                pass: process.env.NODEMAILER_PASS,
            },
        });

        // Format date for email
        const formattedDate = new Date(session.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Send confirmation email to mentee
        await transporter.sendMail({
            from: `"Mentorify" <${process.env.NODEMAILER_USER}>`,
            to: session.menteeId.email,
            subject: "Mentoring Session Confirmed!",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2c3e50;">Session Confirmed!</h2>
                    <p>Hello ${session.menteeId.name},</p>
                    <p>Great news! Your mentoring session has been confirmed with the following details:</p>
                    
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Mentor:</strong> ${session.mentorId.name}</p>
                        <p><strong>Date:</strong> ${formattedDate}</p>
                        <p><strong>Time Slot:</strong> ${session.timeSlot}</p>
                    </div>

                    <p>Please make sure to:</p>
                    <ul>
                        <li>Be on time for your session</li>
                        <li>Prepare any specific questions you'd like to discuss</li>
                        <li>Have a stable internet connection</li>
                    </ul>
                    
                    <div style="margin-top: 20px; color: #666;">
                        <p>Best regards,</p>
                        <p>The Mentorify Team</p>
                    </div>
                </div>
            `
        });

        return res.status(200).json({
            success: true,
            message: "Session confirmed and notification sent to mentee",
            session
        });

    } catch (error) {
        console.error("Error accepting session:", error);
        return res.status(500).json({
            success: false,
            message: "Error accepting session",
            error: error.message
        });
    }
};

// Update session status to cancelled (instead of deleting)
const deleteSessionRequest = async (req, res) => {
    try {
        const { sessionId } = req.params;

        // Find and update the session status to cancelled
        const session = await Session.findByIdAndUpdate(
            sessionId,
            { status: 'cancelled' },
            { new: true }
        ).populate('menteeId mentorId');

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Session not found"
            });
        }

        // Create email transporter
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.NODEMAILER_USER,
                pass: process.env.NODEMAILER_PASS,
            },
        });

        // Format date for email
        const formattedDate = new Date(session.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Send cancellation email to mentee
        await transporter.sendMail({
            from: `"Mentorify" <${process.env.NODEMAILER_USER}>`,
            to: session.menteeId.email,
            subject: "Mentoring Session Cancelled",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2c3e50;">Session Cancelled</h2>
                    <p>Hello ${session.menteeId.name},</p>
                    <p>We regret to inform you that your mentoring session has been cancelled. Here are the details of the cancelled session:</p>
                    
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Mentor:</strong> ${session.mentorId.name}</p>
                        <p><strong>Date:</strong> ${formattedDate}</p>
                        <p><strong>Time Slot:</strong> ${session.timeSlot}</p>
                    </div>

                    <p>You can book another session with the same or different mentor through our platform.</p>
                    
                    <div style="margin-top: 20px; color: #666;">
                        <p>Best regards,</p>
                        <p>The Mentorify Team</p>
                    </div>
                </div>
            `
        });

        return res.status(200).json({
            success: true,
            message: "Session cancelled and notification sent to mentee",
            session
        });

    } catch (error) {
        console.error("Error cancelling session:", error);
        return res.status(500).json({
            success: false,
            message: "Error cancelling session",
            error: error.message
        });
    }
};

// Helper function to check if a session is past its end time
const isSessionPast = (session) => {
    try {
        const [startTime] = session.timeSlot.split(' - ');
        const today = new Date();
        const [time, period] = startTime.split(' ');
        const [hours, minutes] = time.split(':');
        
        // Convert to 24-hour format
        let sessionHours = parseInt(hours);
        if (period === 'PM' && sessionHours !== 12) {
            sessionHours += 12;
        } else if (period === 'AM' && sessionHours === 12) {
            sessionHours = 0;
        }

        // Get current day name
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDay = days[today.getDay()];
        
        // If the session day is today and current time is past the session end time
        if (session.day === currentDay) {
            const currentHour = today.getHours();
            const currentMinutes = today.getMinutes();
            
            // Add one hour to session start time (assuming sessions are 1 hour)
            sessionHours += 1;
            
            return (currentHour > sessionHours || 
                   (currentHour === sessionHours && currentMinutes > parseInt(minutes)));
        }
        
        // If the session day is in the past
        const dayIndex = days.indexOf(session.day);
        const currentDayIndex = today.getDay();
        return dayIndex < currentDayIndex;
        
    } catch (error) {
        console.error('Error in isSessionPast:', error);
        return false;
    }
};

// Function to update completed sessions
// const updateCompletedSessions = async () => {
//     try {
//         // Find all confirmed sessions
//         const sessions = await Session.find({
//             status: 'confirmed'
//         });

//         let updatedCount = 0;
//         // Filter and update past sessions
//         for (const session of sessions) {
//             if (isSessionPast(session)) {
//                 session.status = 'completed';
//                 await session.save();
//                 updatedCount++;
//                 console.log(`Session ${session._id} marked as completed`);
//             }
//         }

//         return updatedCount;

//     } catch (error) {
//         console.error('Error updating completed sessions:', error);
//         throw error;
//     }
// };

// // Schedule cron job to run every hour
// cron.schedule('0 * * * *', async () => {
//     console.log('Running completed sessions update job');
//     await updateCompletedSessions();
// });

// Manual completion of a session by mentor
const manualUpdateCompletedSessions = async (req, res) => {
    try {
        const mentorId = req.user.id;
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: "Session ID is required"
            });
        }

        const session = await Session.findOne({
            _id: sessionId,
            mentorId: mentorId,
            status: 'confirmed'
        }).populate('menteeId', 'name email');

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Confirmed session not found"
            });
        }

        const now = new Date().toISOString();  // Always get UTC time
        const sessionDate = new Date(session.date); 
        sessionDate.setUTCHours(0, 0, 0, 0);  // Normalize to UTC

        const [startTime, endTime] = session.timeSlot.split(' - ');
        const [time, period] = endTime.split(' ');
        const [hours, minutes] = time.split(':');

        let sessionHours = parseInt(hours);
        if (period.toUpperCase() === 'PM' && sessionHours !== 12) {
            sessionHours += 12;
        } else if (period.toUpperCase() === 'AM' && sessionHours === 12) {
            sessionHours = 0;
        }

        sessionDate.setUTCHours(sessionHours, parseInt(minutes), 0, 0); 

        if (new Date(now) < sessionDate) {
            return res.status(400).json({
                success: false,
                message: "Cannot mark session as completed before it ends",
                sessionEndTime: sessionDate
            });
        }

        session.status = 'completed';
        await session.save();

        const mentorAvailability = await MentorAvailability.findOne({ mentorId });
        if (mentorAvailability) {
            const daySlot = mentorAvailability.slotsPerDay.find(d => d.day === session.day);
            if (daySlot) {
                const timeSlot = daySlot.slots.find(
                    slot => `${slot.startTime} - ${slot.endTime}` === session.timeSlot
                );
                if (timeSlot) {
                    timeSlot.isBooked = false;
                    await mentorAvailability.save();
                }
            }
        }

        return res.status(200).json({
            success: true,
            message: "Session marked as completed successfully",
            completedSession: {
                sessionId: session._id,
                mentee: {
                    id: session.menteeId._id,
                    name: session.menteeId.name,
                    email: session.menteeId.email
                },
                day: session.day,
                date: session.date,
                timeSlot: session.timeSlot,
                status: session.status,
                completedAt: session.updatedAt
            }
        });

    } catch (error) {
        console.error("Error marking session as completed:", error);
        return res.status(500).json({
            success: false,
            message: "Error marking session as completed",
            error: error.message
        });
    }
};


// Get upcoming accepted sessions for a mentor
const getUpcomingAcceptedSessions = async (req, res) => {
    try {
        const mentorId = req.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of day

        // Fetch all upcoming confirmed or rescheduled sessions
        const upcomingSessions = await Session.find({
            mentorId: mentorId,
            status: { $in: ['confirmed', 'rescheduled'] },
            date: { $gte: today } // Only get sessions from today onwards
        })
        .populate('menteeId', 'name email')
        .sort({ 'date': 1, 'timeSlot': 1 }) // Sort by date and time
        .exec();

        // If no upcoming sessions found
        if (!upcomingSessions || upcomingSessions.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No upcoming sessions found",
                sessions: []
            });
        }

        // Format the response data
        const formattedSessions = upcomingSessions.map(session => ({
            sessionId: session._id,
            mentee: {
                id: session.menteeId._id,
                name: session.menteeId.name,
                email: session.menteeId.email
            },
            day: session.day,
            date: session.date,
            timeSlot: session.timeSlot,
            status: session.status,
            message: session.message || ''
        }));

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

// Get completed sessions for a mentor
const getCompletedSessions = async (req, res) => {
    try {
        const mentorId = req.user.id;

        // Fetch all completed sessions for the mentor
        const completedSessions = await Session.find({
            mentorId: mentorId,
            status: 'completed'
        })
        .populate('menteeId', 'name email')
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
            mentee: {
                id: session.menteeId._id,
                name: session.menteeId.name,
                email: session.menteeId.email
            },
            day: session.day,
            date: session.date,
            timeSlot: session.timeSlot,
            message: session.message || '',
            status: session.status,
            completedAt: session.updatedAt
        }));

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

// Get cancelled sessions for a mentor
const getCancelledSessions = async (req, res) => {
    try {
        const mentorId = req.user.id;

        // Fetch all cancelled sessions for the mentor
        const cancelledSessions = await Session.find({
            mentorId: mentorId,
            status: 'cancelled'
        })
        .populate('menteeId', 'name email')
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
            mentee: {
                id: session.menteeId._id,
                name: session.menteeId.name,
                email: session.menteeId.email
            },
            day: session.day,
            date: session.date,
            timeSlot: session.timeSlot,
            message: session.message || '',
            status: session.status,
            cancelledAt: session.updatedAt
        }));

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

// Update mentor availability
const updateMentorAvailability = async (req, res) => {
    try {
        const mentorId = req.user.id;
        const { availableDays, slotsPerDay } = req.body;

        // Step 1: Validate input data
        if (!Array.isArray(availableDays) || availableDays.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Available days must be a non-empty array"
            });
        }

        // Validate each day
        if (!availableDays.every(day => isValidDay(day))) {
            return res.status(400).json({
                success: false,
                message: "Invalid day provided. Days must be Monday through Sunday"
            });
        }

        // Validate slotsPerDay
        if (!Array.isArray(slotsPerDay) || slotsPerDay.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Slots per day must be a non-empty array"
            });
        }

        // Step 2: Find existing availability
        const existingAvailability = await MentorAvailability.findOne({ mentorId });

        if (!existingAvailability) {
            return res.status(404).json({
                success: false,
                message: "No availability settings found. Please set initial availability first."
            });
        }

        // Step 3: Check for existing bookings
        for (const daySlot of slotsPerDay) {
            // Validate day format
            if (!isValidDay(daySlot.day)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid day: ${daySlot.day}`
                });
            }

            // Validate slots array
            if (!Array.isArray(daySlot.slots) || daySlot.slots.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: `No time slots provided for ${daySlot.day}`
                });
            }

            // Validate each time slot
            for (const slot of daySlot.slots) {
                if (!isValidTimeFormat(slot.startTime) || !isValidTimeFormat(slot.endTime)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid time format. Use HH:MM AM/PM format"
                    });
                }

                // Check for existing bookings in this slot
                const existingDaySlot = existingAvailability.slotsPerDay.find(
                    existing => existing.day === daySlot.day
                );

                if (existingDaySlot) {
                    const existingSlot = existingDaySlot.slots.find(
                        existing => existing.isBooked &&
                        existing.startTime === slot.startTime &&
                        existing.endTime === slot.endTime
                    );

                    if (existingSlot) {
                        // Check if there are any upcoming sessions in this slot
                        const upcomingSession = await Session.findOne({
                            mentorId,
                            day: daySlot.day,
                            timeSlot: `${slot.startTime} - ${slot.endTime}`,
                            status: { $in: ['pending', 'confirmed'] },
                            date: { $gte: new Date() }
                        });

                        if (upcomingSession) {
                            return res.status(400).json({
                                success: false,
                                message: `Cannot modify slot ${slot.startTime} - ${slot.endTime} on ${daySlot.day} as it has upcoming bookings`
                            });
                        }
                    }
                }
            }
        }

        // Step 4: Update availability
        existingAvailability.availableDays = availableDays;
        existingAvailability.slotsPerDay = slotsPerDay.map(daySlot => ({
            day: daySlot.day,
            slots: daySlot.slots.map(slot => ({
                startTime: slot.startTime,
                endTime: slot.endTime,
                isBooked: false // Reset booking status for new slots
            }))
        }));

        // Step 5: Save updates
        await existingAvailability.save();

        // Step 6: Return success response
        return res.status(200).json({
            success: true,
            message: "Availability updated successfully",
            availability: existingAvailability
        });

    } catch (error) {
        console.error("Error updating mentor availability:", error);
        return res.status(500).json({
            success: false,
            message: "Error updating availability",
            error: error.message
        });
    }
};

// Get mentor profile
const getMentorDetails = async (req, res) => {
    try {
      // Extract mentor ID from request parameters
      const { id } = req.params;
  
      // Fetch mentor details, populating reviews for better insights
      const mentor = await Mentor.findById(id).populate("reviews");
  
      // If mentor not found, return error
      if (!mentor) {
        return res.status(404).json({ message: "Mentor not found" });
      }
  
      // Send response with mentor data
      res.status(200).json(mentor);
    } catch (error) {
      console.error("Error fetching mentor details:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
  

// Update mentor profile
const updateMentorProfile = async (req, res) => {
    try {
      // Extract mentor ID from request parameters
      const { id } = req.params;
  
      // Extract updated data from request body
      const { name, profilePicture, experience, currentPosition } = req.body;
  
      // Find mentor by ID
      let mentor = await Mentor.findById(id);
  
      // If mentor not found, return error
      if (!mentor) {
        return res.status(404).json({ message: "Mentor not found" });
      }
  
      // Ensure the logged-in mentor is updating their own profile
      if (mentor._id.toString() !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized action" });
      }
  
      // Update mentor fields (avoiding email and password changes)
      mentor.name = name || mentor.name;
      mentor.profilePicture = profilePicture || mentor.profilePicture;
      mentor.experience = experience || mentor.experience;
      mentor.currentPosition = currentPosition || mentor.currentPosition;
  
      // Save updated mentor data
      await mentor.save();
  
      // Send response with updated data
      res.status(200).json({ message: "Profile updated successfully", mentor });
    } catch (error) {
      console.error("Error updating mentor profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };

// Upload profile picture
const uploadProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please upload an image"
            });
        }

        const mentorId = req.user.id;

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: "mentor_profiles",
            width: 300,
            crop: "scale"
        });

        // Clean up the local file after upload
        fs.unlinkSync(req.file.path);

        // Update mentor profile with new image URL
        const updatedMentor = await Mentor.findByIdAndUpdate(
            mentorId,
            { profilePicture: result.secure_url },
            { new: true }
        ).select('-password');

        return res.status(200).json({
            success: true,
            message: "Profile picture uploaded successfully",
            data: {
                profilePicture: result.secure_url,
                mentor: updatedMentor
            }
        });

    } catch (error) {
        // Clean up file if it exists and there was an error
        if (req.file && req.file.path) {
            fs.unlinkSync(req.file.path);
        }
        
        console.error("Error uploading profile picture:", error);
        return res.status(500).json({
            success: false,
            message: "Error uploading profile picture",
            error: error.message
        });
    }
};

//get mentor image url
const getMentorImageUrl = async (req, res) => {
    try {
        const mentorId = req.user.id;
        const mentor = await Mentor.findById(mentorId);
        return res.status(200).json({
            success: true,
            message: "Mentor image URL retrieved successfully",
            data: {
                profilePicture: mentor.profilePicture
            }
        });
    } catch (error) {
        console.error("Error fetching mentor image URL:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching mentor image URL",
        });
    }
};

// Add meeting link to confirmed session
const addMeetingLink = async (req, res) => {
    try {
        const mentorId = req.user.id;
        const { sessionId, meetingLink } = req.body;

        // Input validation
        if (!sessionId || !meetingLink) {
            return res.status(400).json({
                success: false,
                message: "Session ID and meeting link are required"
            });
        }

        // Validate meeting link format (should be a Google Meet link)
        if (!meetingLink.startsWith('https://meet.google.com/')) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid Google Meet link"
            });
        }

        // Find the session and ensure it belongs to this mentor
        const session = await Session.findOne({
            _id: sessionId,
            mentorId: mentorId,
            status: 'confirmed'
        }).populate('menteeId mentorId');

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Confirmed session not found"
            });
        }

        // Update session with meeting link
        session.meetingLink = meetingLink;
        session.meetingLinkSent = true;
        await session.save();

        // Create email transporter
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.NODEMAILER_USER,
                pass: process.env.NODEMAILER_PASS,
            },
        });

        // Format date for email
        const formattedDate = new Date(session.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Send meeting link email to mentee
        await transporter.sendMail({
            from: `"Mentorify" <${process.env.NODEMAILER_USER}>`,
            to: session.menteeId.email,
            subject: "Meeting Link for Your Mentoring Session",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2c3e50;">Meeting Link Added!</h2>
                    <p>Hello ${session.menteeId.name},</p>
                    <p>Your mentor has added the meeting link for your upcoming session:</p>
                    
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Mentor:</strong> ${session.mentorId.name}</p>
                        <p><strong>Date:</strong> ${formattedDate}</p>
                        <p><strong>Time Slot:</strong> ${session.timeSlot}</p>
                        <p><strong>Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>
                    </div>

                    <p>Please join the meeting on time using the link above.</p>
                    
                    <div style="margin-top: 20px; color: #666;">
                        <p>Best regards,</p>
                        <p>The Mentorify Team</p>
                    </div>
                </div>
            `
        });

        return res.status(200).json({
            success: true,
            message: "Meeting link added and sent to mentee successfully",
            session: {
                sessionId: session._id,
                meetingLink: session.meetingLink,
                mentee: {
                    name: session.menteeId.name,
                    email: session.menteeId.email
                },
                date: formattedDate,
                timeSlot: session.timeSlot
            }
        });

    } catch (error) {
        console.error("Error adding meeting link:", error);
        return res.status(500).json({
            success: false,
            message: "Error adding meeting link",
            error: error.message
        });
    }
};

module.exports = {
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
    getMentorDetails,
    updateMentorProfile,
    uploadProfilePicture,
    getMentorImageUrl,
    addMeetingLink
};
