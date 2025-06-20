// config/mail.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'festichillthelast@gmail.com',
    pass: 'hcpx thml zfym exfo',
  },
});

async function sendMail(message, receiveur, subject) {
  const mailOptions = {
    from: 'festichillthelast@gmail.com',
    to: receiveur,
    subject: subject,
    text: message,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Mail envoyé à", receiveur);
  } catch (err) {
    console.error('❌ Erreur envoi mail :', err);
  }
}

module.exports = sendMail;
