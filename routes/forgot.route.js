const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Worker = require('../models/WorkerModel'); // Apna path check kar lena
const sendEmail = require('../utils/sendEmail'); // Jo mail bhejne ki file banai thi

// ==========================================
// 1. FORGOT PASSWORD ROUTE
// ==========================================
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // 1. Check karo ki user database me hai ya nahi
    const worker = await Worker.findOne({ email });
    if (!worker) {
      return res.status(404).json({ success: false, message: 'No account found with this email!' });
    }

    // 2. Ek random secure token generate karo
    const resetToken = crypto.randomBytes(20).toString('hex');

    // 3. Usko hash karke database me save karo (Security ke liye)
    worker.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // 4. Expiry time set karo (Maan lo 15 minutes)
    worker.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

    await worker.save();

    // 5. Reset Link banao
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    // Frontend pe hum ye link handle karenge
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    // 6. Email bhejo
    const message = `
      You requested a password reset for your IMGLOBAL CRM account.
      Please click on the link below to reset your password:
      \n\n ${resetUrl} \n\n
      If you did not request this, please ignore this email. This link will expire in 15 minutes.
    `;

    try {
      await sendEmail({
        email: worker.email,
        subject: 'Password Reset - IMGLOBAL CRM',
        message,
        html: `
          <h3>Password Reset Request</h3>
          <p>You requested a password reset. Click the button below to set a new password:</p>
          <a href="${resetUrl}" style="padding: 10px 20px; background-color: #0f62fe; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
          <p>If the button doesn't work, copy and paste this link in your browser:</p>
          <p>${resetUrl}</p>
          <p><em>This link expires in 15 minutes.</em></p>
        `
      });

      res.status(200).json({ success: true, message: 'Reset link sent to email!' });
    } catch (err) {
      // Agar email bhejne me error aaye toh token clear kar do
      worker.resetPasswordToken = undefined;
      worker.resetPasswordExpire = undefined;
      await worker.save();
      console.log("Mail Error:", err);
      return res.status(500).json({ success: false, message: 'Email could not be sent. Check your email credentials.' });
    }
  } catch (error) {
    console.log("Server Error:", error);
    res.status(500).json({ success: false, message: 'Server error occurred while processing forgot password.' });
  }
});

// ==========================================
// 2. RESET PASSWORD ROUTE
// ==========================================
router.put('/reset-password/:token', async (req, res) => {
  try {
    // 1. Frontend se jo token URL me aayega (req.params.token), usko wapas hash karo taaki database me match kar sakein
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    // 2. Database me wo user dhoondo jiska token match ho aur expiry time abhi bacha ho ($gt means greater than)
    const worker = await Worker.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!worker) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token!' });
    }

    // 3. Naya password set karo aur usko encrypt karo
    const salt = await bcrypt.genSalt(10);
    worker.password = await bcrypt.hash(req.body.password, salt);

    // 4. Purane token aur expiry ko hata do
    worker.resetPasswordToken = undefined;
    worker.resetPasswordExpire = undefined;

    await worker.save();

    res.status(200).json({ success: true, message: 'Password updated successfully. You can now login!' });
  } catch (error) {
    console.log("Reset Error:", error);
    res.status(500).json({ success: false, message: 'Server error occurred while resetting password.' });
  }
});


module.exports = router;