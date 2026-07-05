// src/mail/templates/contact.email.templates.ts

export interface ContactFormData {
  firstName:  string;
  lastName:   string;
  email:      string;
  mobile?:     string;
  subject:    string;
  message:    string;
  submittedAt?: Date;
}

const SUBJECT_LABELS: Record<string, string> = {
  general:     'General Enquiry',
  support:     'Technical Support',
  survey:      'Survey Help',
  billing:     'Billing & Account',
  partnership: 'Partnership & Business',
  feedback:    'Feedback & Suggestions',
  other:       'Other',
};

// ─────────────────────────────────────────────────────────────────────────────
//  Template 1 — Thank-you email sent to the USER who submitted the form
//
//  Usage:
//    await mailService.send({
//      to:      data.email,
//      subject: 'We received your message – Project Management',
//      html:    contactThankYouTemplate(data),
//    });
// ─────────────────────────────────────────────────────────────────────────────
export const contactThankYouTemplate = (data: ContactFormData): string => {
  const year         = new Date().getFullYear();
  const subjectLabel = SUBJECT_LABELS[data.subject] ?? data.subject;
  const firstName    = data.firstName;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Thank you for contacting us – Project Management</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f3ff;
             font-family:'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#f5f3ff;padding:40px 16px;">
    <tr>
      <td align="center">

        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:580px;background:#ffffff;border-radius:20px;
                      box-shadow:0 8px 32px rgba(79,70,229,0.12);overflow:hidden;">

          <!-- ── Header ── -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);
                       padding:48px 40px 40px;text-align:center;">

              <!-- Icon circle -->
              <div style="display:inline-block;
                          width:72px;height:72px;
                          background:rgba(255,255,255,0.18);
                          border-radius:20px;
                          text-align:center;line-height:72px;
                          margin-bottom:20px;">
                <!-- Support agent SVG (inline, no external dependency) -->
                <img src="https://img.icons8.com/ios-filled/48/ffffff/add-contact-to-company.png"
                alt="Mail icon" width="40" height="40"
                     style="display:block;border:0; padding: 16px;" >                
              </div>

              <h1 style="margin:0 0 10px;font-size:26px;font-weight:800;
                         color:#ffffff;letter-spacing:-0.4px;line-height:1.2;">
                Thank you for contacting us!
              </h1>
              <p style="margin:0;font-size:15px;
                        color:rgba(255,255,255,0.85);line-height:1.6;">
                We've received your message and our team<br/>
                is already on it.
              </p>
            </td>
          </tr>

          <!-- ── Body ── -->
          <tr>
            <td style="padding:40px 40px 36px;">

              <!-- Personalised greeting -->
              <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.75;">
                Hi <strong style="color:#1e1b4b;">${firstName}</strong>,
              </p>

              <p style="margin:0 0 28px;font-size:15px;color:#444;line-height:1.75;">
                Thank you for reaching out to <strong style="color:#4f46e5;">Project Management</strong>.
                We have received your enquiry and one of our team members will be
                in touch with you <strong>within 24 hours</strong>.
              </p>

              <!-- What you submitted summary box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#f5f3ff;border:1px solid #ddd6fe;
                             border-radius:14px;padding:24px 24px;">

                    <p style="margin:0 0 16px;font-size:11px;font-weight:700;
                               color:#7c3aed;text-transform:uppercase;
                               letter-spacing:1.5px;">
                      Your submission
                    </p>

                    <!-- Subject row -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0"
                           style="margin-bottom:10px;">
                      <tr>
                        <td style="width:90px;font-size:12px;font-weight:600;
                                   color:#9ca3af;text-transform:uppercase;
                                   letter-spacing:0.5px;vertical-align:top;
                                   padding-top:2px;">
                          Subject
                        </td>
                        <td style="font-size:14px;font-weight:600;color:#1e1b4b;">
                          ${subjectLabel}
                        </td>
                      </tr>
                    </table>

                    <!-- Divider -->
                    <div style="height:1px;background:#e9d5ff;margin:10px 0 14px;"></div>

                    <!-- Message preview -->
                    <p style="margin:0 0 6px;font-size:12px;font-weight:600;
                               color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">
                      Message
                    </p>
                    <p style="margin:0;font-size:14px;color:#374151;
                               line-height:1.65;
                               border-left:3px solid #a78bfa;
                               padding-left:12px;">
                      ${escapeHtml(data.message)}
                    </p>

                  </td>
                </tr>
              </table>

              <!-- What happens next -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin-top:24px;">
                <tr>
                  <td style="padding:18px 20px;background:#f0fdf4;
                             border:1px solid #a7f3d0;border-radius:12px;">
                    <p style="margin:0 0 10px;font-size:13px;font-weight:700;
                               color:#065f46;">
                      What happens next?
                    </p>
                    <p style="margin:0 0 6px;font-size:13px;color:#374151;
                               line-height:1.6;">
                      ✓&nbsp; Our support team reviews your message
                    </p>
                    <p style="margin:0 0 6px;font-size:13px;color:#374151;
                               line-height:1.6;">
                      ✓&nbsp; We'll reply to
                      <strong>${escapeHtml(data.email)}</strong>
                      within 24 hours
                    </p>
                    <p style="margin:0;font-size:13px;color:#374151;line-height:1.6;">
                      ✓&nbsp; For urgent matters call us on
                      <strong>+1 (555) 000-1234</strong>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Security note -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin-top:20px;">
                <tr>
                  <td style="background:#fef9f0;border-left:4px solid #f59e0b;
                             border-radius:6px;padding:12px 16px;">
                    <p style="margin:0;font-size:12px;color:#92400e;line-height:1.6;">
                      <strong>Didn't submit this form?</strong>
                      If you did not contact us, please ignore this email —
                      no action is required.
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
                This email was sent by
                <strong style="color:#4f46e5;">Project Management</strong>.
                Questions?
                <a href="mailto:support@ayalaweb.com"
                   style="color:#4f46e5;text-decoration:none;font-weight:600;">
                  support@ayalaweb.com
                </a>
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


// ─────────────────────────────────────────────────────────────────────────────
//  Template 2 — Admin notification sent to the ADMIN when a contact form
//               is submitted. Contains all the user's details in a
//               structured table for easy review.
//
//  Usage:
//    await mailService.send({
//      to:      process.env.ADMIN_EMAIL,
//      subject: `[Contact Us] New message from ${data.firstName} ${data.lastName}`,
//      html:    contactAdminNotificationTemplate(data),
//    });
// ─────────────────────────────────────────────────────────────────────────────
export const contactAdminNotificationTemplate = (data: ContactFormData): string => {
  const year         = new Date().getFullYear();
  const subjectLabel = SUBJECT_LABELS[data.subject] ?? data.subject;
  const submittedAt  = data.submittedAt
    ? data.submittedAt.toLocaleString('en-US', {
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });

  const fullName = `${escapeHtml(data.firstName)} ${escapeHtml(data.lastName)}`;

  // Row helper — keeps the table DRY
  const row = (label: string, value: string, valueColor = '#1e1b4b') => `
    <tr>
      <td style="padding:12px 16px;background:#f9f8ff;border-bottom:1px solid #ede9fe;
                 font-size:12px;font-weight:700;color:#7c3aed;text-transform:uppercase;
                 letter-spacing:0.6px;white-space:nowrap;width:120px;
                 vertical-align:top;">
        ${label}
      </td>
      <td style="padding:12px 16px;background:#ffffff;border-bottom:1px solid #ede9fe;
                 font-size:14px;color:${valueColor};line-height:1.6;word-break:break-word;">
        ${value}
      </td>
    </tr>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>[Contact Us] New message from ${fullName}</title>
</head>
<body style="margin:0;padding:0;background-color:#faf9ff;
             font-family:'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#faf9ff;padding:40px 16px;">
    <tr>
      <td align="center">

        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;background:#ffffff;border-radius:20px;
                      box-shadow:0 8px 32px rgba(79,70,229,0.10);overflow:hidden;">

          <!-- ── Admin header — amber tone to visually distinguish from user emails ── -->
          <tr>
            <td style="background:linear-gradient(135deg,#d97706 0%,#f59e0b 100%);
                       padding:32px 40px;text-align:center;">

              <!-- Alert icon -->
              <div style="display:inline-block;
                          width:56px;height:56px;
                          background:rgba(255,255,255,0.22);
                          border-radius:14px;
                          text-align:center;line-height:56px;
                          margin-bottom:14px;">
                <img src="https://img.icons8.com/ios-filled/48/ffffff/add-contact-to-company.png"
                alt="Mail icon" width="40" height="40"
                     style="display:block;border:0; padding: 10px;" >
              </div>

              <!-- Badge -->
              <div style="display:inline-block;background:rgba(255,255,255,0.25);
                          border:1px solid rgba(255,255,255,0.4);
                          border-radius:50px;padding:4px 14px;margin-bottom:12px;">
                <span style="font-size:11px;font-weight:700;color:#fff;
                             text-transform:uppercase;letter-spacing:1.2px;">
                  Admin Notification
                </span>
              </div>

              <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;
                         color:#ffffff;letter-spacing:-0.3px;line-height:1.3;">
                New Contact Form Submission
              </h1>
              <p style="margin:0;font-size:14px;
                        color:rgba(255,255,255,0.9);line-height:1.5;">
                From <strong>${fullName}</strong> · ${submittedAt}
              </p>
            </td>
          </tr>

          <!-- ── Body ── -->
          <tr>
            <td style="padding:36px 40px 32px;">

              <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.65;">
                A new contact form has been submitted on
                <strong style="color:#4f46e5;">Project Management</strong>.
                Review the details below and respond to the user within 24 hours.
              </p>

              <!-- ── Caller details table ── -->
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;
                         color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">
                Sender Details
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="border:1px solid #ede9fe;border-radius:12px;
                            overflow:hidden;margin-bottom:24px;">
                ${row('Full Name',  fullName)}
                ${row('Email',
                  `<a href="mailto:${escapeHtml(data.email)}"
                      style="color:#4f46e5;text-decoration:none;font-weight:600;">
                     ${escapeHtml(data.email)}
                   </a>`,
                  '#4f46e5')}
                ${row('Phone',      data.mobile ? escapeHtml(data.mobile) : '<span style="color:#9ca3af;">Not provided</span>')}
                ${row('Subject',    `<strong>${subjectLabel}</strong>`)}
                ${row('Submitted',  submittedAt, '#6b7280')}
              </table>

              <!-- ── Full message ── -->
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;
                         color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">
                Message
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#f5f3ff;border:1px solid #ddd6fe;
                             border-radius:12px;padding:20px 22px;">
                    <p style="margin:0;font-size:15px;color:#374151;
                               line-height:1.75;white-space:pre-wrap;
                               word-break:break-word;">
                      ${escapeHtml(data.message)}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- ── Quick reply CTA ── -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin-top:28px;">
                <tr>
                  <td align="center">
                    <a href="mailto:${escapeHtml(data.email)}?subject=Re: ${encodeURIComponent(subjectLabel)} – Project Management"
                       style="display:inline-block;
                              background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);
                              color:#ffffff;text-decoration:none;
                              font-size:15px;font-weight:700;
                              padding:14px 40px;border-radius:50px;
                              box-shadow:0 6px 20px rgba(79,70,229,0.35);
                              letter-spacing:0.2px;">
                      Reply to ${escapeHtml(data.firstName)}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- ── Reminder note ── -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin-top:20px;">
                <tr>
                  <td style="background:#fff8e1;border-left:4px solid #f59e0b;
                             border-radius:6px;padding:12px 16px;">
                    <p style="margin:0;font-size:12px;color:#92400e;line-height:1.6;">
                      <strong>Reminder:</strong> Please respond to this enquiry
                      within <strong>24 hours</strong> to maintain our
                      service commitment.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="background:#f7f8ff;border-top:1px solid #e5e7eb;
                       padding:20px 40px;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;line-height:1.6;">
                This is an automated admin notification from
                <strong style="color:#4f46e5;">Project Management</strong>.
                Do not forward this email.
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


// ─────────────────────────────────────────────────────────────────────────────
//  Shared helper — escapes HTML special characters to prevent XSS
//  in user-submitted content rendered inside the email HTML body
// ─────────────────────────────────────────────────────────────────────────────
function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}