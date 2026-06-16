import sgMail from "@sendgrid/mail";
import fallbackSendEmail, { sendEmail as smtpSendEmail } from "./email.js";

// sendEmail supports two call styles for compatibility with existing code:
// 1) sendEmail({ to, subject, text, html })
// 2) sendEmail(to, subject, html, text?)
export default async function sendEmail(a, b, c, d) {
  // normalize args
  let to, subject, html, text;

  if (typeof a === "object" && a !== null && !Array.isArray(a)) {
    ({ to, subject, html, text } = a);
  } else {
    to = a;
    subject = b;
    html = c;
    text = d;
  }

  if (!to || !subject) {
    return { error: true, message: "Missing required parameters to sendEmail" };
  }

  // Prefer SendGrid Web API when configured
  if (process.env.SENDGRID_API_KEY) {
    try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      const msg = {
        to,
        from:
          process.env.EMAIL_FROM ||
          process.env.EMAIL_USER ||
          "no-reply@example.com",
        subject,
        text: text || (html ? html.replace(/<[^>]*>/g, "") : undefined),
        html,
      };

      // send returns an array of responses for batch sends
      const resp = await sgMail.send(msg);
      return { info: resp };
    } catch (err) {
      // Log helpful error details server-side
      // eslint-disable-next-line no-console
      console.error(
        "SendGrid send error:",
        err && err.response ? err.response.body : err.message || err,
      );
      const message =
        err && err.response && err.response.body
          ? JSON.stringify(err.response.body)
          : err.message || String(err);
      return { error: true, message };
    }
  }

  // Fallback to SMTP-based helper
  try {
    // smtpSendEmail expects an object with {to,subject,text,html}
    const result = await smtpSendEmail({ to, subject, text, html });
    return result;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      "Fallback SMTP send error:",
      err && err.message ? err.message : err,
    );
    return {
      error: true,
      message: err && err.message ? err.message : String(err),
    };
  }
}
