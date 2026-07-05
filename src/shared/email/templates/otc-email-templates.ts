import { readFileSync } from 'fs';
import { join } from 'path';

// ─────────────────────────────────────────────────────────────────────────────
//  Shared helper — reads an SVG from assets and returns a Base64 data URI
//  so images are fully self-contained (no external requests, works in Outlook)
// ─────────────────────────────────────────────────────────────────────────────
function getSvgIconBase64(filename: string, fallbackPath: string): string {
  try {
    const svgPath = join(__dirname, '..', '..', '..', 'assets', 'images', filename);
    return `data:image/svg+xml;base64,${readFileSync(svgPath).toString('base64')}`;
  } catch {
    return `data:image/svg+xml;base64,${Buffer.from(fallbackPath).toString('base64')}`;
  }
}

function getMailIconBase64(): string {
  return getSvgIconBase64(
    'mail-verify.svg',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40" fill="white">
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
    </svg>`,
  );
}

function getVoteIconBase64(): string {
  return getSvgIconBase64(
    'vote-otp.svg',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40" fill="white">
      <path d="M18 3H6C4.9 3 4 3.9 4 5v14c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h6v2zm3-4H7v-2h9v2zm0-4H7V7h9v2z"/>
    </svg>`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Template 2 — Vote verification OTP
//  Sent when a user submits a vote; contains a large 6-digit code to enter
//  in the verification dialog — NOT a clickable link.
// ─────────────────────────────────────────────────────────────────────────────
export const voteOtpEmailTemplate = (params: {
  otp:        string;   // 6-digit code  e.g. '503868'
  surveyName: string;   // name of the survey being voted on
  partyName:  string;   // party the user selected
  voterEmail: string;   // recipient address (shown back to user for clarity)
  domain:     string;   // for footer support link
  expiresInMinutes?: number; // default 5
}): string => {

  const {
    otp,
    surveyName,
    partyName,
    voterEmail,
    domain,
    expiresInMinutes = 5,
  } = params;

  const year         = new Date().getFullYear();
  const voteIconSrc  = "https://img.icons8.com/ios-filled/50/ffffff/one-time-password.png"; //getVoteIconBase64();

  // Render each OTP digit as an individual styled cell for maximum email-client
  // compatibility (avoids letter-spacing / word-spacing rendering differences)
  const otpCells = otp
    .split('')
    .map(
      (digit) =>
        `<td style="width:52px;height:60px;background:#eef2ff;border:2px solid #c7d2fe;
                    border-radius:12px;text-align:center;vertical-align:middle;
                    font-size:28px;font-weight:800;color:#4f46e5;
                    font-family:'Courier New',monospace;padding:0;">
           ${digit}
         </td>`,
    )
    .join('<td style="width:8px;"></td>'); // gap between cells

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Your vote verification code – Project Management</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f3ff;font-family:'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#f5f3ff;padding:40px 16px;">
    <tr>
      <td align="center">

        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;background:#ffffff;border-radius:20px;
                      box-shadow:0 8px 32px rgba(79,70,229,0.12);overflow:hidden;">

          <!-- ── Header — indigo/amber palette to distinguish from account email ── -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);
                       padding:40px 40px 32px;text-align:center;">

              <div style="display:inline-block;background:rgba(255,255,255,0.18);
                          border-radius:16px;padding:14px;margin-bottom:18px;">
                <img src="${voteIconSrc}" alt="Vote icon"
                     width="40" height="40" style="display:block;border:0;" />
              </div>

              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;
                         letter-spacing:-0.3px;">Your Vote Verification Code</h1>
              <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.82);line-height:1.5;">
                Use the code below to confirm your vote
              </p>

              <!-- Amber survey name badge -->
              <div style="display:inline-block;background:rgba(245,158,11,0.2);
                          border:1px solid rgba(245,158,11,0.4);border-radius:50px;
                          padding:6px 18px;margin-top:16px;">
                <span style="font-size:13px;font-weight:600;color:#fde68a;
                             letter-spacing:0.3px;">
                  ${surveyName}
                </span>
              </div>
            </td>
          </tr>

          <!-- ── Body ── -->
          <tr>
            <td style="padding:40px 40px 32px;">

              <p style="margin:0 0 8px;font-size:15px;color:#444;line-height:1.7;">
                Hi <strong style="color:#1e1b4b;">${voterEmail}</strong>,
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#444;line-height:1.7;">
                We received your vote for
                <strong style="color:#4f46e5;">${partyName}</strong>
                in the <strong>${surveyName}</strong> survey.
                Enter the 6-digit code below in the verification window to confirm your vote.
              </p>

              <!-- ── OTP block ── -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#f5f3ff;border:1px solid #ddd6fe;
                             border-radius:16px;padding:28px 20px;text-align:center;">

                    <p style="margin:0 0 16px;font-size:11px;font-weight:700;
                               color:#7c3aed;text-transform:uppercase;letter-spacing:1.5px;">
                      Verification Code
                    </p>

                    <!-- Individual digit cells -->
                    <table cellpadding="0" cellspacing="0" border="0"
                           style="margin:0 auto 16px;">
                      <tr>${otpCells}</tr>
                    </table>

                    <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                      Enter this code in the verification dialog on the survey page
                    </p>
                  </td>
                </tr>
              </table>

              <!-- ── Info pills ── -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin-top:24px;">
                <tr>
                  <td width="50%" style="padding-right:8px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                      <td style="background:#fff8e1;border-radius:10px;padding:14px 16px;">
                        <p style="margin:0 0 4px;font-size:11px;font-weight:700;
                                   color:#d97706;text-transform:uppercase;letter-spacing:0.7px;">
                          Expires in
                        </p>
                        <p style="margin:0;font-size:14px;color:#555;font-weight:600;">
                          ${expiresInMinutes} minutes
                        </p>
                      </td>
                    </tr></table>
                  </td>
                  <td width="50%" style="padding-left:8px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                      <td style="background:#ecfdf5;border-radius:10px;padding:14px 16px;">
                        <p style="margin:0 0 4px;font-size:11px;font-weight:700;
                                   color:#059669;text-transform:uppercase;letter-spacing:0.7px;">
                          Your selection
                        </p>
                        <p style="margin:0;font-size:14px;color:#555;font-weight:600;
                                   overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                          ${partyName}
                        </p>
                      </td>
                    </tr></table>
                  </td>
                </tr>
              </table>

              <!-- ── Security / disclaimer note ── -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin-top:24px;">
                <tr>
                  <td style="background:#fef9f0;border-left:4px solid #f59e0b;
                             border-radius:6px;padding:14px 18px;">
                    <p style="margin:0 0 6px;font-size:13px;color:#92400e;
                               font-weight:700;line-height:1.4;">
                      Didn't request this code?
                    </p>
                    <p style="margin:0;font-size:13px;color:#666;line-height:1.6;">
                      If you did not attempt to cast a vote, please ignore this email.
                      Your vote will <strong>not</strong> be recorded unless the code is entered.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- ── One-vote reminder ── -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin-top:16px;">
                <tr>
                  <td style="background:#f0f2f8;border-left:4px solid #4f46e5;
                             border-radius:6px;padding:14px 18px;">
                    <p style="margin:0;font-size:13px;color:#666;line-height:1.6;">
                      <strong style="color:#4f46e5;">One vote per survey.</strong>
                      Once verified, your vote is final and cannot be changed.
                      Each participant may vote only once per survey.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="background:#f7f8ff;border-top:1px solid #e5e7eb;
                       padding:24px 40px;text-align:center;">
              <p style="margin:0 0 6px;font-size:13px;color:#888;line-height:1.6;">
                This email was sent by <strong style="color:#4f46e5;">Project Management</strong>
                on behalf of the survey organiser.
                Questions? Contact our
                <a href="mailto:support@${domain}"
                   style="color:#4f46e5;text-decoration:none;font-weight:600;">support team</a>.
              </p>
              <p style="margin:0;font-size:11px;color:#bbb;">
                © ${year} Project Management. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`.trim();
};

export const buildOtpEmailHtml = (otp: string, firstName: string): string => {
    const year = new Date().getFullYear();

    const otpCells = otp
      .split('')
      .map(
        (d) => `
          <td style="width:52px;height:64px;
                    background:#eef2ff;border:2px solid #c7d2fe;
                    border-radius:12px;text-align:center;vertical-align:middle;
                    font-size:30px;font-weight:800;color:#4f46e5;
                    font-family:'Courier New',Courier,monospace;">
            ${d}
          </td>`,
      )
      .join('<td style="width:8px;"></td>');

    return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
    <title>Password Reset Code – Project Management</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f3ff;
              font-family:'Segoe UI',Arial,sans-serif;">
  
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
          style="background:#f5f3ff;padding:40px 16px;">
      <tr><td align="center">
  
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
              style="max-width:560px;background:#fff;border-radius:20px;
                      box-shadow:0 8px 32px rgba(79,70,229,0.12);overflow:hidden;">
  
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);
                      padding:40px 40px 32px;text-align:center;">
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;
                        color:#fff;letter-spacing:-0.3px;">
                Password Reset Code
              </h1>
              <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.82);line-height:1.5;">
                Enter this code to reset your password
              </p>
            </td>
          </tr>
  
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.7;">
                Hi <strong>${firstName}</strong>,<br/><br/>
                We received a request to reset the password for your Project Management account.
                Use the code below — it is valid for <strong>5 minutes</strong>.
              </p>
  
              <!-- OTP block -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#f5f3ff;border:1px solid #ddd6fe;
                            border-radius:16px;padding:28px 20px;text-align:center;">
                    <p style="margin:0 0 18px;font-size:11px;font-weight:700;
                              color:#7c3aed;text-transform:uppercase;letter-spacing:1.8px;">
                      Verification Code
                    </p>
                    <table cellpadding="0" cellspacing="0" border="0"
                          style="margin:0 auto 16px;">
                      <tr>${otpCells}</tr>
                    </table>
                    <p style="margin:0;font-size:12px;color:#9ca3af;">
                      Enter this code exactly as shown
                    </p>
                  </td>
                </tr>
              </table>
  
              <!-- Info pills -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                    style="margin-top:20px;">
                <tr>
                  <td width="50%" style="padding-right:8px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                      <td style="background:#fff8e1;border-radius:10px;padding:12px 14px;text-align:center;">
                        <p style="margin:0 0 3px;font-size:10px;font-weight:700;
                                  color:#d97706;text-transform:uppercase;letter-spacing:0.7px;">
                          Expires in
                        </p>
                        <p style="margin:0;font-size:14px;color:#555;font-weight:600;">5 minutes</p>
                      </td>
                    </tr></table>
                  </td>
                  <td width="50%" style="padding-left:8px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                      <td style="background:#fce4ec;border-radius:10px;padding:12px 14px;text-align:center;">
                        <p style="margin:0 0 3px;font-size:10px;font-weight:700;
                                  color:#be185d;text-transform:uppercase;letter-spacing:0.7px;">
                          Single use
                        </p>
                        <p style="margin:0;font-size:14px;color:#555;font-weight:600;">One-time code</p>
                      </td>
                    </tr></table>
                  </td>
                </tr>
              </table>
  
              <!-- Security note -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                    style="margin-top:20px;">
                <tr>
                  <td style="background:#fef9f0;border-left:4px solid #f59e0b;
                            border-radius:6px;padding:14px 18px;">
                    <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#92400e;">
                      Didn't request this?
                    </p>
                    <p style="margin:0;font-size:13px;color:#666;line-height:1.6;">
                      Ignore this email — your password will not change unless you enter this code.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
  
          <!-- Footer -->
          <tr>
            <td style="background:#f7f8ff;border-top:1px solid #e5e7eb;
                      padding:20px 40px;text-align:center;">
              <p style="margin:0 0 4px;font-size:13px;color:#888;">
                Sent by <strong style="color:#4f46e5;">Project Management</strong>
              </p>
              <p style="margin:0;font-size:11px;color:#bbb;">
                © ${year} Project Management. All rights reserved.
              </p>
            </td>
          </tr>
  
        </table>
      </td></tr>
    </table>
  </body>
  </html>`.trim();
}
