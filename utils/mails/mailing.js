import nodemailer from "nodemailer"
import dotenv from "dotenv/config"

// const transporter = nodemailer.createTransport({
//     service: "gmail",
//     host: 'smtp.gmail.com',
//     port: 587,
//     secure: false,
//     auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.APP_PASSWORD,
//     },
// });

const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'cindy.renner@ethereal.email',
        pass: 'A9PQF1qmJ7UYThtvDn'
    }
});

// async..await is not allowed in global scope, must use a wrapper
// async function main() {
//     // send mail with defined transport object
//     const info = await transporter.sendMail({
//       from: '"Maddison Foo Koch 👻" <maddison53@ethereal.email>', // sender address
//       to: "bar@example.com, baz@example.com", // list of receivers
//       subject: "Hello ✔", // Subject line
//       text: "Hello world?", // plain text body
//       html: "<b>Hello world?</b>", // html body
//     });
  
//     console.log("Message sent: %s", info.messageId);
//     // Message sent: <d786aa62-4e0a-070a-47ed-0b0666549519@ethereal.email>
//   }
  
//   main().catch(console.error);


async function sendMail(subject, message, users) {
    try {
        // Join the user emails array into a comma-separated string
        const recipients = users.join(', ');

        // Set up mail options
        const mailOptions = {
            from: "MOCKUP@LOL.dk",  // Sender email
            to: recipients,         // Recipients: Array of emails joined into a string
            subject,                // Email subject
            html: message           // Email body (plain text)
        };

        // Send the email using nodemailer
        const info = await transporter.sendMail(mailOptions);
        console.log("Message sent: %s", info.messageId);
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info)); // Preview link for testing
    } catch (error) {
        console.error("Error sending email:", error);
    }
}

export { sendMail };