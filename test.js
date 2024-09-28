const { sendEmail } = require('./config/mailer');

async function testEmail() {
     try {
          await sendEmail('mohamedbella235@example.com', 'Test Email', 'This is a test', '<p>This is a test</p>');
          console.log('Email sent successfully');
     } catch (error) {
          console.error('Error sending email:', error);
     }
}

testEmail();
