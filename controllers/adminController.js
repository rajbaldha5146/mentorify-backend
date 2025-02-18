// Import the Mentor model
const Mentor = require("../models/mentor");

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
        const mentors = await Mentor.find({});

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
