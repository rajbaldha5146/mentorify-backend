require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authroutes");
const adminRoutes = require("./routes/adminDashbord");
const menteeRoutes = require("./routes/menteeDashbord");
const mentorRoutes = require("./routes/mentorDashbord");
const reviewRoutes = require("./routes/reviewrote");
require('./controllers/mentorDashbord'); // This will start the cron job
const cors = require('cors');
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL?.split(",") || ["http://localhost:3000"],
  credentials: true
}));

// Routes
app.use("/api/v1", authRoutes);
app.use("/api/v1/mentee", menteeRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/mentor", mentorRoutes);
app.use("/api/v1/mentee/reviews", reviewRoutes);

// Basic health check
app.get("/api/health", (req, res) => {
  res.json({ status: "API operational" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});