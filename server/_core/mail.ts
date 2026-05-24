import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

async function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || "587"),
      secure: parseInt(SMTP_PORT || "587") === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
    console.log("[Mail] Using custom SMTP server:", SMTP_HOST);
  } else {
    // Generate an ethereal account for development if no SMTP config is provided
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });
    console.log("[Mail] Using Ethereal Email for testing.");
  }

  return transporter;
}

export async function sendEmailOTP(to: string, code: string, context: "Registration" | "Login 2FA") {
  const mailer = await getTransporter();

  const info = await mailer.sendMail({
    from: '"NG-SENTRA SOC" <no-reply@ng-sentra.com>',
    to,
    subject: `Your ${context} Verification Code`,
    text: `Your Verification Code for NG-SENTRA SOC is: ${code}. It expires in 5 minutes.`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #00c8ff;">NG-SENTRA SOC</h2>
        <p>You requested a verification code for <strong>${context}</strong>.</p>
        <p>Your code is:</p>
        <h1 style="font-size: 32px; letter-spacing: 4px; padding: 10px; background: #f4f4f4; border-radius: 4px; text-align: center;">${code}</h1>
        <p>This code expires in 5 minutes.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777;">If you did not request this, please ignore this email or contact the SOC admin.</p>
      </div>
    `,
  });

  console.log(`[Mail] Message sent: %s`, info.messageId);
  // Preview only available when sending through an Ethereal account
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[Mail] 📧 Preview URL: %s`, previewUrl);
  }
}
