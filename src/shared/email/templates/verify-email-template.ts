import { readFileSync } from 'fs';
import { join } from 'path';
 
/**
 * Reads the mail SVG from the assets folder and converts it to a Base64
 * data URI so the image is fully self-contained in the email (no external
 * requests, works in every email client including Outlook).
 */
function getMailIconBase64(): string {
  try {
    const svgPath = join(__dirname, '..', 'assets', 'images', 'mail-verify.svg');
    const svgBuffer = readFileSync(svgPath);
    const base64 = svgBuffer.toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
  } catch {
    // Fallback: inline SVG data URI with the envelope path hard-coded.
    // Used during local dev if the asset file hasn't been created yet.
    const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40" fill="white">
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
    </svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(fallbackSvg).toString('base64')}`;
  }
}

export const verifyEmailTemplateForCode = (code: string) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>Thank you for registering! Please use the following code to verify your email address:</p>
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0;">
            <strong>${code}</strong>
          </div>
          <p>This code will expire in 30 minutes.</p>
          <p>If you didn't request this verification, please ignore this email.</p>
        </div>
`

export const verifyEmailTemplate = (code: string, userId: string, firstName: string, domain: string): string => {
  const verificationUrl = `${domain}/auth/verifyemail/${userId}/${code}`;
  const year = new Date().getFullYear();
  const mailIconSrc = "https://img.icons8.com/ios-filled/50/ffffff/message-link.png"; //getMailIconBase64();
  const first_name = firstName || 'User';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Verify your email – Project Management</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f8;font-family:'Segoe UI',Arial,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#f0f2f8;padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;background:#ffffff;border-radius:20px;
                      box-shadow:0 8px 32px rgba(102,126,234,0.12);overflow:hidden;">

          <!-- ── Header gradient banner ── -->
          <tr>
            <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);
                       padding:44px 40px 36px;text-align:center;">

              <!-- Logo icon -->
              <div style="display:inline-block;background:rgba(255,255,255,0.2);
                          border-radius:16px;padding:14px;margin-bottom:20px;">
                <img src="${mailIconSrc}"
                     alt="Mail icon" width="40" height="40"
                     style="display:block;border:0;" />
              </div>

              <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#ffffff;
                         letter-spacing:-0.3px;">Verify your email address</h1>
              <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.85);
                        line-height:1.5;">
                One quick step and you're all set!
              </p>
            </td>
          </tr>

          <!-- ── Body ── -->
          <tr>
            <td style="padding:44px 40px 36px;">

              <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.7;">
                Hi ${first_name},<br/><br/>
                Thanks for signing up for <strong style="color:#667eea;">Project Management</strong>.
                To activate your account, click the button below. This link is valid for
                <strong>30&nbsp;minutes</strong>.
              </p>

              <!-- ── CTA button ── -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin:32px 0;">
                <tr>
                  <td align="center">
                    <a href="${verificationUrl}"
                       style="display:inline-block;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);
                              color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;
                              padding:16px 48px;border-radius:50px;
                              box-shadow:0 6px 20px rgba(102,126,234,0.45);
                              letter-spacing:0.3px;">
                      ✉&nbsp;&nbsp;Verify My Email
                    </a>
                  </td>
                </tr>
              </table>

              <!-- ── Divider ── -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin:32px 0;">
                <tr>
                  <td style="border-top:1px solid #eee;"></td>
                  <td style="padding:0 14px;white-space:nowrap;font-size:12px;
                             color:#aaa;text-transform:uppercase;letter-spacing:1px;">
                    or use this link
                  </td>
                  <td style="border-top:1px solid #eee;"></td>
                </tr>
              </table>

              <!-- ── Fallback URL box ── -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#f7f8ff;border:1px solid #e0e4ff;
                             border-radius:10px;padding:14px 18px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;
                               color:#999;text-transform:uppercase;letter-spacing:0.8px;">
                      Verification link
                    </p>
                    <a href="${verificationUrl}"
                       style="font-size:12px;color:#667eea;word-break:break-all;
                              text-decoration:none;">
                      ${verificationUrl}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- ── Info pills ── -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin-top:32px;">
                <tr>
                  <td width="50%" style="padding-right:8px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background:#fff8e1;border-radius:10px;
                                   padding:14px 16px;vertical-align:top;">
                          <p style="margin:0 0 4px;font-size:11px;font-weight:700;
                                     color:#f59e0b;text-transform:uppercase;
                                     letter-spacing:0.7px;">⏱ Expires in</p>
                          <p style="margin:0;font-size:14px;color:#555;font-weight:600;">
                            30 minutes
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="50%" style="padding-left:8px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background:#fce4ec;border-radius:10px;
                                   padding:14px 16px;vertical-align:top;">
                          <p style="margin:0 0 4px;font-size:11px;font-weight:700;
                                     color:#e91e63;text-transform:uppercase;
                                     letter-spacing:0.7px;">🔒 Single use</p>
                          <p style="margin:0;font-size:14px;color:#555;font-weight:600;">
                            One-time link
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- ── Security note ── -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin-top:28px;">
                <tr>
                  <td style="background:#f0f2f8;border-left:4px solid #667eea;
                             border-radius:6px;padding:14px 18px;">
                    <p style="margin:0;font-size:13px;color:#666;line-height:1.6;">
                      🛡&nbsp;<strong>Didn't create an account?</strong>
                      You can safely ignore this email — no account will be activated
                      without clicking the link above.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="background:#f7f8ff;border-top:1px solid #eee;
                       padding:24px 40px;text-align:center;">
              <p style="margin:0 0 6px;font-size:13px;color:#888;line-height:1.6;">
                This email was sent by <strong style="color:#667eea;">Project Management</strong>.
                If you have questions, contact our
                <a href="mailto:support@${domain}"
                   style="color:#667eea;text-decoration:none;font-weight:600;">
                  support team</a>.
              </p>
              <p style="margin:0;font-size:11px;color:#bbb;">
                © ${year} Project Management. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();
};

export const VerifyOrganizationRegistration = (code: string, oguid: string, orgName: string, domain: string): string => {
  const verificationUrl = `${domain}/auth/verifyorg/${oguid}/${code}`;
  const year = new Date().getFullYear();
  const mailIconSrc = "https://img.icons8.com/ios-filled/50/ffffff/message-link.png"; //getMailIconBase64();
  const first_name = orgName || 'User';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Verify your org email – Project Management</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f8;font-family:'Segoe UI',Arial,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#f0f2f8;padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;background:#ffffff;border-radius:20px;
                      box-shadow:0 8px 32px rgba(102,126,234,0.12);overflow:hidden;">

          <!-- ── Header gradient banner ── -->
          <tr>
            <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);
                       padding:44px 40px 36px;text-align:center;">

              <!-- Logo icon -->
              <div style="display:inline-block;background:rgba(255,255,255,0.2);
                          border-radius:16px;padding:14px;margin-bottom:20px;">
                <img src="${mailIconSrc}"
                     alt="Mail icon" width="40" height="40"
                     style="display:block;border:0;" />
              </div>

              <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#ffffff;
                         letter-spacing:-0.3px;">Verify your email address</h1>
              <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.85);
                        line-height:1.5;">
                One quick step and you're all set!
              </p>
            </td>
          </tr>

          <!-- ── Body ── -->
          <tr>
            <td style="padding:44px 40px 36px;">

              <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.7;">
                Hi ${first_name},<br/><br/>
                Thanks for signing up for <strong style="color:#667eea;">Project Management</strong>.
                To activate your account, click the button below. This link is valid for
                <strong>30&nbsp;minutes</strong>.
              </p>

              <!-- ── CTA button ── -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin:32px 0;">
                <tr>
                  <td align="center">
                    <a href="${verificationUrl}"
                       style="display:inline-block;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);
                              color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;
                              padding:16px 48px;border-radius:50px;
                              box-shadow:0 6px 20px rgba(102,126,234,0.45);
                              letter-spacing:0.3px;">
                      ✉&nbsp;&nbsp;Verify My Email
                    </a>
                  </td>
                </tr>
              </table>

              <!-- ── Divider ── -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin:32px 0;">
                <tr>
                  <td style="border-top:1px solid #eee;"></td>
                  <td style="padding:0 14px;white-space:nowrap;font-size:12px;
                             color:#aaa;text-transform:uppercase;letter-spacing:1px;">
                    or use this link
                  </td>
                  <td style="border-top:1px solid #eee;"></td>
                </tr>
              </table>

              <!-- ── Fallback URL box ── -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#f7f8ff;border:1px solid #e0e4ff;
                             border-radius:10px;padding:14px 18px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;
                               color:#999;text-transform:uppercase;letter-spacing:0.8px;">
                      Verification link
                    </p>
                    <a href="${verificationUrl}"
                       style="font-size:12px;color:#667eea;word-break:break-all;
                              text-decoration:none;">
                      ${verificationUrl}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- ── Info pills ── -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin-top:32px;">
                <tr>
                  <td width="50%" style="padding-right:8px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background:#fff8e1;border-radius:10px;
                                   padding:14px 16px;vertical-align:top;">
                          <p style="margin:0 0 4px;font-size:11px;font-weight:700;
                                     color:#f59e0b;text-transform:uppercase;
                                     letter-spacing:0.7px;">⏱ Expires in</p>
                          <p style="margin:0;font-size:14px;color:#555;font-weight:600;">
                            30 minutes
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="50%" style="padding-left:8px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background:#fce4ec;border-radius:10px;
                                   padding:14px 16px;vertical-align:top;">
                          <p style="margin:0 0 4px;font-size:11px;font-weight:700;
                                     color:#e91e63;text-transform:uppercase;
                                     letter-spacing:0.7px;">🔒 Single use</p>
                          <p style="margin:0;font-size:14px;color:#555;font-weight:600;">
                            One-time link
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- ── Security note ── -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin-top:28px;">
                <tr>
                  <td style="background:#f0f2f8;border-left:4px solid #667eea;
                             border-radius:6px;padding:14px 18px;">
                    <p style="margin:0;font-size:13px;color:#666;line-height:1.6;">
                      🛡&nbsp;<strong>Didn't create an account?</strong>
                      You can safely ignore this email — no account will be activated
                      without clicking the link above.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="background:#f7f8ff;border-top:1px solid #eee;
                       padding:24px 40px;text-align:center;">
              <p style="margin:0 0 6px;font-size:13px;color:#888;line-height:1.6;">
                This email was sent by <strong style="color:#667eea;">Project Management</strong>.
                If you have questions, contact our
                <a href="mailto:support@${domain}"
                   style="color:#667eea;text-decoration:none;font-weight:600;">
                  support team</a>.
              </p>
              <p style="margin:0;font-size:11px;color:#bbb;">
                © ${year} Project Management. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();
};