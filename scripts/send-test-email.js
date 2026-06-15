import dotenv from "dotenv";
dotenv.config();

import { sendEmail } from "../utils/email.js";
import verificationEmail from "../utils/emailTemplates/verificationTemplate.js";

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Usage: node send-test-email.js recipient@example.com [Name]");
  process.exit(1);
}

const [email, name] = args;

(async () => {
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(
      `Sending test verification email to ${email} with code ${code}`,
    );
    const info = await sendEmail({
      to: email,
      subject: "Test: Verify your account",
      text: `Your verification code is: ${code}`,
      html: verificationEmail({ name: name || "", code, expiresMinutes: 15 }),
    });
    console.log("Email sent:", info.messageId || info.response || info);
    process.exit(0);
  } catch (err) {
    console.error("Failed to send test email", err);
    process.exit(2);
  }
})();
