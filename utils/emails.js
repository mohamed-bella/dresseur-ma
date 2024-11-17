// emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
     service: 'yahoo',
     host: "smtp.mail.yahoo.com",
     port: 465,
     secure: true, // true for 465, false for other ports
     auth: {
          user: 'ghizlaneakouan@yahoo.com',
          pass: 'vijwurvhmmujirco'
     }
});

async function sendNewServiceEmail(to, serviceName) {
     const mailOptions = {
          from: 'ghizlaneakouan@yahoo.com',
          to: to,
          subject: 'Thank you for sharing your service!',
          text: `Hello,\n\nThank you for sharing your service "${serviceName}" on our platform. We are excited to have you on board!\n\nBest regards,\nThe Team`,
     };

     try {
          await transporter.sendMail(mailOptions);
          console.log('Email sent successfully.');
     } catch (error) {
          console.error('Error sending email:', error);
     }
}
// Function to send an email to a single recipient
async function sendEmail(to, subject, htmlContent) {
     const mailOptions = {
          from: 'ghizlaneakouan@yahoo.com',
          to,
          subject,
          html: htmlContent,
     };

     return transporter.sendMail(mailOptions);
}
async function sendBroadcastEmail(to, subject, message) {
     const mailOptions = {
          from: 'ghizlaneakouan@yahoo.com',
          to: to, // Array of emails
          subject: subject,
          html: message, // Use 'html' instead of 'text' for HTML content
     };

     try {
          await transporter.sendMail(mailOptions);
          console.log('Broadcast email sent successfully.');
     } catch (error) {
          console.error('Error sending broadcast email:', error);
     }
}


module.exports = { sendNewServiceEmail, sendBroadcastEmail, sendEmail };
