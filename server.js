require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const FRONTEND_URL = "https://mentorify-frontend-beta.vercel.app"
// Import Routes
const authRoutes = require("./routes/authroutes");
const adminRoutes = require("./routes/adminDashbord");
const menteeRoutes = require("./routes/menteeDashbord");
const mentorRoutes = require("./routes/mentorDashbord");
const reviewRoutes = require("./routes/reviewrote");
require("./controllers/mentorDashbord"); // Start cron job

// Initialize Express App
const app = express();

// Connect to MongoDB
connectDB();

const allowedOrigins = [
  'http://localhost:3000', 
  'https://mentorify-frontend-beta.vercel.app'
];

// CORS Configuration
// app.use(cors({
//   origin: FRONTEND_URL || 'http://localhost:3000',
//   credentials: true,  // This allows cookies to be sent with requests
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
//   optionsSuccessStatus: 200
// }));

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Middleware
app.use(express.json());

// Routes
app.use("/api/v1", authRoutes);
app.use("/api/v1/mentee", menteeRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/mentor", mentorRoutes);
app.use("/api/v1/mentee/reviews", reviewRoutes);

// Health Check Route
app.get("/api/health", (req, res) => {
    res.json({ status: "API operational" });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
