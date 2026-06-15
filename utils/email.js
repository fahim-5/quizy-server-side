import dotenv from "dotenv";
import nodemailer from "nodemailer";

// Load environment variables early so any importer gets configured values
dotenv.config();

// Helper to build transport. If SMTP is not configured we will fall back to
// an Ethereal test account so developers can preview messages locally.
async function createTransport() {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;

  if (host && user) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : 587,
      secure: process.env.EMAIL_SECURE === "true",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }

  // No SMTP configured — create a test account
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
}

export const sendEmail = async ({ to, subject, text, html }) => {
  const transport = await createTransport();
  const from =
    process.env.EMAIL_FROM || process.env.EMAIL_USER || "no-reply@example.com";
  const info = await transport.sendMail({ from, to, subject, text, html });

  // If using Ethereal test account, log preview URL for developer convenience
  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) {
    // eslint-disable-next-line no-console
    console.info("Email preview URL:", preview);
  }

  return { info, preview };
};

export default sendEmail;
