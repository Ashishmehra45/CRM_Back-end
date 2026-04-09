// utils/sendEmail.js
const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1. Transporter create karo (Email bhejnewala)
  const transporter = nodemailer.createTransport({
    service: 'gmail', // Ya jo bhi email service tu use kar raha hai
    auth: {
      user: process.env.EMAIL_USER, // Tera email (e.g., tera.email@gmail.com)
      pass: process.env.EMAIL_PASS, // Tera Gmail App Password (NOT regular password)
    },
  });

  // 2. Email ke options define karo
  const mailOptions = {
    from: `IMGLOBAL CRM <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html, // Agar HTML email bhejna hai toh
  };

  // 3. Email bhej do
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;