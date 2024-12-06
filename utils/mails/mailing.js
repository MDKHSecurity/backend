import nodemailer from "nodemailer"
import dotenv from "dotenv/config"


const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'cindy.renner@ethereal.email',
        pass: 'A9PQF1qmJ7UYThtvDn'
    }
});


async function sendMail(subject, message, users) {
    try {
        // Join the user emails array into a comma-separated string
        const recipients = users.join(', ');

        // Set up mail options
        const mailOptions = {
            from: "MOCKUP@LOL.dk",  
            to: recipients,         
            subject,                
            html: message           
        };

        // Send the email using nodemailer
        const info = await transporter.sendMail(mailOptions);
        console.log("Message sent: %s", info.messageId);
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info)); 
    } catch (error) {
        console.error("Error sending email:", error);
    }
}

export { sendMail };