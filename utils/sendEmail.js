const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (options) => {
  try {
    const msg = {
      to: options.email,
      from: `IMGLOBAL CRM <${process.env.EMAIL_USER}>`, // ✅ verified sender
      subject: options.subject,
      text: options.message,
      html: options.html,
    };

    const info = await sgMail.send(msg);

    console.log("Mail Sent ✅");

    return true;

  } catch (error) {
    console.error("Mail Error ❌", error.response?.body || error.message);
    throw new Error("Email sending failed");
  }
};

module.exports = sendEmail;