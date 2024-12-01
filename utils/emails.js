// emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
     service: 'yahoo',
     host: "smtp.mail.yahoo.com",
     port: 465,
     secure: true,
     auth: {
         user: process.env.EMAIL_USER || 'ghizlaneakouan@yahoo.com',
         pass: process.env.EMAIL_PASS || 'vijwurvhmmujirco'
     }
 });
 
 function generateEmailTemplate(post) {
     const typeLabels = {
         'adoption': 'à l\'adoption',
         'perdu': 'perdu',
         'trouve': 'trouvé'
     };
 
     return `
         <!DOCTYPE html>
         <html>
         <head>
             <style>
                 body { font-family: Arial, sans-serif; line-height: 1.6; }
                 .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                 .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
                 .content { background-color: #f9fafb; padding: 20px; margin-top: 20px; }
             </style>
         </head>
         <body>
             <div class="container">
                 <div class="header">
                     <h1>Confirmation de votre annonce</h1>
                 </div>
                 <div class="content">
                     <p>Bonjour,</p>
                     <p>Votre annonce pour le chien ${post.name} (${typeLabels[post.type]}) a été publiée avec succès.</p>
                     <p>Détails de l'annonce :</p>
                     <ul>
                         <li>Type : ${typeLabels[post.type]}</li>
                         <li>Nom : ${post.name}</li>
                         <li>Race : ${post.breed}</li>
                         <li>Localisation : ${post.location.city}</li>
                     </ul>
                     <p>Vous pouvez gérer votre annonce en vous connectant à votre compte.</p>
                 </div>
             </div>
         </body>
         </html>
     `;
 }
 
 async function sendConfirmationEmail(post) {
     try {
         const mailOptions = {
             from: process.env.EMAIL_USER || 'ghizlaneakouan@yahoo.com',
             to: post.contactInfo.email,
             subject: `Confirmation de votre annonce - ${post.name}`,
             html: generateEmailTemplate(post)
         };
 
         await transporter.sendMail(mailOptions);
         console.log('Email de confirmation envoyé à:', post.contactInfo.email);
         return true;
     } catch (error) {
         console.error('Erreur lors de l\'envoi de l\'email:', error);
         return false;
     }
 }

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


module.exports = { sendNewServiceEmail, sendBroadcastEmail, sendEmail,sendConfirmationEmail };
