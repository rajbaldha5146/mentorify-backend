const mongoose = require("mongoose");

const MentorAvailabilitySchema = new mongoose.Schema({
    mentorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Mentor",
        required: true,
        unique: true, 
    },
    availableDays: {
        type: [String], // Example: ["Monday", "Wednesday", "Friday"]
        required: true,
    },
    slotsPerDay: [
        {
            day: { type: String, required: true },
            slots: [
                {
                    startTime: { type: String, required: true },
                    endTime: { type: String, required: true },
                    bookedDates: [{ type: String }] // Array of booked dates
                },
            ],
        },
    ],
});

const MentorAvailability = mongoose.model("MentorAvailability", MentorAvailabilitySchema);
module.exports = MentorAvailability;
