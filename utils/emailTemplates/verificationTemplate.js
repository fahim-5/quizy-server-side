export const verificationEmail = ({
  name = "",
  code = "",
  expiresMinutes = 15,
}) => {
  const displayName = name ? name : "User";
  const expiryText = `${expiresMinutes} minutes`;
  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>Verify your email</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; background:#f4f6f8; margin:0; padding:0; }
        .container { max-width:600px; margin:28px auto; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 18px rgba(0,0,0,0.06); }
        .header { background:#111827; color:#fff; padding:20px; text-align:center; }
        .content { padding:24px; color:#111827; }
        .code { display:block; font-size:28px; letter-spacing:6px; text-align:center; background:#f3f4f6; padding:12px 18px; margin:18px auto; border-radius:6px; width:fit-content; }
        .note { font-size:13px; color:#6b7280; margin-top:12px; }
        .button { display:inline-block; background:#111827; color:#ffffff; padding:10px 16px; border-radius:6px; text-decoration:none; margin-top:16px; }
        .footer { font-size:12px; color:#9ca3af; text-align:center; padding:18px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Online Quiz Platform</h2>
        </div>
        <div class="content">
          <p>Hi ${displayName},</p>
          <p>Thanks for creating an account. Use the verification code below to confirm your email address. The code expires in ${expiryText}.</p>
          <div class="code">${code}</div>
          <p>If you didn't create an account with us, you can ignore this email.</p>
          <a class="button" href="#">Go to platform</a>
          <p class="note">This code will expire in ${expiryText}. For security, do not share it with anyone.</p>
        </div>
        <div class="footer">&copy; ${new Date().getFullYear()} Online Quiz Platform — If you need help reply to this email.</div>
      </div>
    </body>
  </html>
  `;
};

export default verificationEmail;
