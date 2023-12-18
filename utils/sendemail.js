const nodemailer = require('nodemailer');
const sendEmail = async (options) => {
    try {
        const transporter = nodemailer.createTransport({
            service:process.env.MAIL_SERVICE,
            auth: {
                user:process.env.MAIL_AUTH,
                pass:process.env.MAIL_PASS
            }
        });

        const emailOptions = {
            from: 'Auth&Auth <sudaisali420@gmail.com>',
            to: options.email,
            subject: options.subject,
            html: options.message
        };

        await transporter.sendMail(emailOptions);
        console.log('Email sent successfully');
    } catch (error) {
        console.error(`Error sending email: ${error.message}`);
        throw error; 
    }
};

module.exports = { sendEmail };
