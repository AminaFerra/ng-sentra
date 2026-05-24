import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
dotenv.config({path:'.env.local'});
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});
transporter.sendMail({
    from: '"NG-SENTRA Test" <no-reply@ng-sentra.com>',
    to: process.env.SMTP_USER,
    subject: 'Test Email',
    text: 'If you receive this, the SMTP is working!'
}).then(info => console.log('Success:', info.messageId)).catch(console.error);
