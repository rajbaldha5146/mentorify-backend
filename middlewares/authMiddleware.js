const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const Mentee = require("../models/mentee");
const Admin = require("../models/admin");
require("dotenv").config();

/*
Algorithm for auth middleware:
1. Extract token from one of three sources:
   - cookies
   - request body
   - Authorization header
2. Check if token exists
3. If no token, return 401 error
4. Try to verify token using JWT_SECRET
5. If verification successful:
   - Add decoded user to request object
   - Call next()
6. If verification fails, return 401 error
7. If any other error occurs, return 500 error
*/
exports.auth = async (req, res, next) => {
    // console.log("auth middleware");
    try {
        // Step 1: Extract token from multiple sources
        const token = 
            // (req.cookies && req.cookies.token) || // safely check cookies
            req.body.token || 
            req.header("Authorization")?.replace("Bearer ", "");
            
        // console.log("Token:", token);
        
        // Step 2 & 3: Check token existence
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: "Token Missing" 
            });
        }

        try {
            // Step 4: Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // Step 5: Add user to request
            req.user = decoded;
            next();
        } catch (error) {
            // Step 6: Handle invalid token
            return res.status(401).json({ 
                success: false, 
                message: "Invalid Token" 
            });
        }
    } catch (error) {
        // Step 7: Handle other errors
        return res.status(500).json({ 
            success: false, 
            message: "Error Validating Token" 
        });
    }
};

/*
Algorithm for isMentee middleware:
1. Use email from decoded token (req.user.email)
2. Search for mentee in database with this email
3. If mentee not found, return 401 error
4. If mentee found, allow access (next())
5. If database error occurs, return 500 error
*/
exports.isMentee = async (req, res, next) => {
    try {
        // Steps 1 & 2: Find mentee by email
        const userDetails = await Mentee.findOne({ email: req.user.email });
        
        // Step 3: Check if mentee exists
        if (!userDetails) {
            return res.status(401).json({ 
                success: false, 
                message: "Access Denied: Not a Mentee" 
            });
        }
        
        // Step 4: Allow access
        next();
    } catch (error) {
        // Step 5: Handle database errors
        return res.status(500).json({ 
            success: false, 
            message: "Error Verifying Mentee Role" 
        });
    }
};

/*
Algorithm for isAdmin middleware:
1. Use email from decoded token (req.user.email)
2. Search for admin in database with this email
3. If admin not found, return 401 error
4. If admin found, allow access (next())
5. If database error occurs, return 500 error
*/
exports.isAdmin = async (req, res, next) => {
    try {
        // Steps 1 & 2: Find admin by email
        const userDetails = await Admin.findOne({ email: req.user.email });
        
        // Step 3: Check if admin exists
        if (!userDetails) {
            return res.status(401).json({ 
                success: false, 
                message: "Access Denied: Not an Admin" 
            });
        }
        
        // Step 4: Allow access
        next();
    } catch (error) {
        // Step 5: Handle database errors
        return res.status(500).json({ 
            success: false, 
            message: "Error Verifying Admin Role" 
        });
    }
};
