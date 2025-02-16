const nodemailer = require("nodemailer");
require("dotenv").config();

/**
 * Sends an email using Nodemailer
 * @param {string} email - Recipient's email
 * @param {string} subject - Email subject
 * @param {string} body - Email HTML content
 * @returns {Promise<Object>} - Info about the sent email
 */
const mailSender = async (email, subject, body) => {
  try {
    // Create a transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PASS,
      },
    });

    // Send the email
    const info = await transporter.sendMail({
      from: `"Mentorify" <${process.env.NODEMAILER_USER}>`,
      to: email,
      subject: subject,
      html: body,
    });

    console.log("Email sent:", info.response);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Error sending email");
  }
};

module.exports = mailSender;
