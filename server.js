require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authroutes");
const adminRoutes = require("./routes/adminroutes");
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());

// Routes
app.use("/api/v1", authRoutes);
app.use("/api/v1/admin", adminRoutes);

// Basic health check
app.get("/api/health", (req, res) => {
  res.json({ status: "API operational" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});