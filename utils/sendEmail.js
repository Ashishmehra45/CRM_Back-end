const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      family: 4, // ✅ IPv4 fix (Render issue solve)
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // ✅ Transport check (important)
    await transporter.verify();
    console.log("SMTP Connected ✅");

    const mailOptions = {
      from: `IMGLOBAL CRM <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("Mail Sent ✅", info.response);

    return true;

  } catch (error) {
    console.error("Mail Error ❌", error.message);

    // ❗ important: error throw karo taaki controller handle kare
    throw new Error("Email sending failed");
  }
};

module.exports = sendEmail;